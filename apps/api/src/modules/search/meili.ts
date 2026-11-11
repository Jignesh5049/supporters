import { SEARCH_LIMITS } from '@supporters/shared';
import { Meilisearch, type Settings } from 'meilisearch';

/** What gets indexed: one Meilisearch index per searchable entity. */
export type SearchEntity = 'business' | 'product' | 'service' | 'post';
export const SEARCH_ENTITIES = ['business', 'product', 'service', 'post'] as const;

export const SEARCH_INDEX = {
  business: 'businesses',
  product: 'products',
  service: 'services',
  post: 'posts',
} as const satisfies Record<SearchEntity, string>;

const INDEX_UIDS = Object.values(SEARCH_INDEX);

export const createMeili = (url: string, apiKey: string) =>
  new Meilisearch({ host: url, apiKey, clientAgents: ['supporters-api'] });

/**
 * `sort` comes first so an explicit sort (newest, price) orders the whole result
 * list rather than only breaking relevance ties. With no sort it does nothing,
 * and the relevance rules decide.
 *
 * `featured:desc` is the Premium boost (product spec, Listings: "Featured …
 * boosts the listing in Discover and search"): among results that match the
 * words equally well, Premium sellers come first. It never lifts a weaker
 * match above a better one, and an explicit sort still wins.
 */
const RANKING_RULES = [
  'sort',
  'words',
  'typo',
  'proximity',
  'attribute',
  'featured:desc',
  'exactness',
];

/** Business fields copied onto listings and posts, so they filter by their seller. */
const SELLER_FILTERS = [
  'businessId',
  'categorySlugs',
  'cityId',
  'stateCode',
  'businessType',
  'isVerified',
];

const common = {
  rankingRules: RANKING_RULES,
  pagination: { maxTotalHits: SEARCH_LIMITS.maxTotalHits },
  // Ids and enum values are filters, not text to match.
  typoTolerance: { disableOnNumbers: true },
} satisfies Settings;

/** Index settings; the order of searchable attributes is their weight. */
export const INDEX_SETTINGS: Record<SearchEntity, Settings> = {
  business: {
    ...common,
    searchableAttributes: ['name', 'tags', 'categoryNames', 'cityName', 'about'],
    filterableAttributes: [
      'categorySlugs',
      'cityId',
      'stateCode',
      'businessType',
      'isVerified',
      'rating',
    ],
    sortableAttributes: ['createdAt', 'rating'],
  },
  product: {
    ...common,
    searchableAttributes: ['title', 'categoryNames', 'businessName', 'details', 'description'],
    filterableAttributes: [...SELLER_FILTERS, 'pricePaise', 'availability', 'moq'],
    sortableAttributes: ['publishedAt', 'pricePaise'],
  },
  service: {
    ...common,
    searchableAttributes: ['title', 'categoryNames', 'businessName', 'details', 'description'],
    filterableAttributes: [...SELLER_FILTERS, 'pricePaise', 'availability'],
    sortableAttributes: ['publishedAt', 'pricePaise'],
  },
  post: {
    ...common,
    searchableAttributes: ['body', 'offerTag', 'businessName'],
    filterableAttributes: [...SELLER_FILTERS, 'postType'],
    sortableAttributes: ['publishedAt'],
  },
};

/**
 * Scoped keys (backend spec, Security: "The API uses a scoped Meilisearch key").
 * The master key never reaches the API or worker: `pnpm search:init` uses it
 * once to create these. The uids are fixed so the script is idempotent.
 */
export const SCOPED_KEYS = {
  /** The API process: search only. */
  search: {
    uid: '6f1a2c4e-5b3d-4e8f-9a7b-1c2d3e4f5a01',
    name: 'supporters-api-search',
    description: 'Supporters API: search the public indexes',
    actions: ['search'],
    indexes: INDEX_UIDS,
    expiresAt: null,
  },
  /** The worker and the reindex script: documents and settings, nothing else. */
  index: {
    uid: '6f1a2c4e-5b3d-4e8f-9a7b-1c2d3e4f5a02',
    name: 'supporters-worker-index',
    description: 'Supporters worker: write documents and settings of the public indexes',
    actions: [
      'documents.add',
      'documents.get',
      'documents.delete',
      'indexes.create',
      'indexes.get',
      'indexes.update',
      'settings.get',
      'settings.update',
      'tasks.get',
    ],
    indexes: INDEX_UIDS,
    expiresAt: null,
  },
} as const;

/** Creates the scoped keys if they are missing and returns their values. Needs the master key. */
export async function ensureScopedKeys(master: Meilisearch) {
  const keyValue = async (spec: (typeof SCOPED_KEYS)[keyof typeof SCOPED_KEYS]) => {
    try {
      return (await master.getKey(spec.uid)).key;
    } catch {
      const created = await master.createKey({
        ...spec,
        actions: [...spec.actions],
        indexes: [...spec.indexes],
      });
      return created.key;
    }
  };
  return { search: await keyValue(SCOPED_KEYS.search), index: await keyValue(SCOPED_KEYS.index) };
}

/** Creates the indexes if needed and applies their settings, waiting until Meilisearch is done. */
export async function ensureIndexes(client: Meilisearch, timeOutMs = 60_000) {
  for (const entity of SEARCH_ENTITIES) {
    const uid = SEARCH_INDEX[entity];
    try {
      await client.getRawIndex(uid);
    } catch {
      await client.createIndex(uid, { primaryKey: 'id' }).waitTask({ timeout: timeOutMs });
    }
    const task = await client
      .index(uid)
      .updateSettings(INDEX_SETTINGS[entity])
      .waitTask({ timeout: timeOutMs });
    if (task.status !== 'succeeded') {
      throw new Error(`settings for ${uid} failed: ${task.error?.message ?? task.status}`);
    }
  }
}
