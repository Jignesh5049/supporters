import { randomBytes } from 'node:crypto';
import {
  type Business,
  type BusinessSummary,
  type CreateBusinessInput,
  type MyBusiness,
  type OpeningHours,
  PLAN_LIMITS,
  type Socials,
  type UpdateBusinessInput,
  openingHoursSchema,
  socialsSchema,
} from '@supporters/shared';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { AppError, ErrorCode, isUniqueViolation, notFound } from '../../lib/errors';
import type { CategoriesService } from '../categories/categories.service';
import { toCategoryRef } from '../categories/categories.service';
import { toCity, type PlacesService } from '../places/places.service';

const businessInclude = {
  category: true,
  subcategory: true,
  city: { include: { state: true } },
} satisfies Prisma.BusinessInclude;
type BusinessRow = Prisma.BusinessGetPayload<{ include: typeof businessInclude }>;

/** Only businesses whose owner is active are public. */
export const PUBLIC_OWNER = { owner: { status: 'active' } } satisfies Prisma.BusinessWhereInput;

const businessExists = () =>
  new AppError(409, ErrorCode.BusinessExists, 'You already have a business', {
    detail: 'Each account can have one business.',
  });
const slugTaken = () => new AppError(409, ErrorCode.SlugTaken, 'That link is taken');
const slugLocked = () =>
  new AppError(409, ErrorCode.SlugLocked, 'The link of a verified business cannot change');
export const businessRequired = () =>
  new AppError(403, ErrorCode.BusinessRequired, 'Create your business first');

export const isPremium = (business: { premiumUntil: Date | null }, now = new Date()) =>
  business.premiumUntil !== null && business.premiumUntil > now;

/** Published products plus services allowed for this business; null means no limit. */
export const publishedListingsLimit = (business: { premiumUntil: Date | null }) =>
  isPremium(business) ? null : PLAN_LIMITS.free.publishedListings;

/** A URL-safe slug from the name; non-Latin names fall back to `business`. */
export function slugify(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replaceAll('&', ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 50)
    .replace(/^-+|-+$/g, '');
  return slug.length >= 3 ? slug : 'business';
}

/** Optional fields that count towards profile completion (logo and cover join with uploads). */
const COMPLETION_CHECKS: ((row: BusinessData) => boolean)[] = [
  (row) => Boolean(row.subcategoryId),
  (row) => Boolean(row.about),
  (row) => row.establishedYear !== null,
  (row) => Boolean(row.gstin),
  (row) => Boolean(row.contactPerson),
  (row) => Boolean(row.contactPhone ?? row.contactEmail),
  (row) => Boolean(row.address && row.pincode),
  (row) => Boolean(row.mapUrl),
  (row) => row.openingHours.length > 0,
  (row) => Boolean(row.website) || Object.keys(row.socials).length > 0,
  (row) => row.tags.length > 0,
];
const REQUIRED_FIELD_COUNT = 4; // name, type, category, city

interface BusinessData {
  subcategoryId: string | null;
  about: string | null;
  establishedYear: number | null;
  gstin: string | null;
  contactPerson: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  address: string | null;
  pincode: string | null;
  mapUrl: string | null;
  website: string | null;
  tags: string[];
  socials: Socials;
  openingHours: OpeningHours;
}

export const profileCompletion = (row: BusinessData) => {
  const done = REQUIRED_FIELD_COUNT + COMPLETION_CHECKS.filter((check) => check(row)).length;
  return Math.round((100 * done) / (REQUIRED_FIELD_COUNT + COMPLETION_CHECKS.length));
};

const readJson = (row: BusinessRow) => ({
  socials: socialsSchema.catch({}).parse(row.socials),
  openingHours: openingHoursSchema.catch([]).parse(row.openingHours),
});

export function toBusinessSummary(row: {
  id: string;
  slug: string;
  name: string;
  verificationStatus: string;
  premiumUntil: Date | null;
  city: { id: string; name: string; state: { code: string } };
}): BusinessSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    city: toCity(row.city),
    isVerified: row.verificationStatus === 'verified',
    isPremium: isPremium(row),
  };
}

function toPublicBusiness(row: BusinessRow): Business {
  const showContact = row.isContactPublic;
  return {
    ...toBusinessSummary(row),
    type: row.type,
    category: toCategoryRef(row.category),
    subcategory: row.subcategory ? toCategoryRef(row.subcategory) : null,
    state: { id: row.city.state.id, code: row.city.state.code, name: row.city.state.name },
    gstin: row.gstin,
    about: row.about,
    establishedYear: row.establishedYear,
    tags: row.tags,
    website: row.website,
    contactPerson: row.contactPerson,
    contactPhone: showContact ? row.contactPhone : null,
    contactEmail: showContact ? row.contactEmail : null,
    address: row.address,
    pincode: row.pincode,
    mapUrl: row.mapUrl,
    ...readJson(row),
    createdAt: row.createdAt.toISOString(),
  };
}

const CLEARABLE_FIELDS = [
  'subcategoryId',
  'gstin',
  'about',
  'establishedYear',
  'website',
  'contactPerson',
  'contactPhone',
  'contactEmail',
  'address',
  'pincode',
  'mapUrl',
] as const;

export class BusinessesService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly categories: CategoriesService,
    private readonly places: PlacesService,
  ) {}

  /** The signed-in user's business id and plan, for listing writes. */
  async requireOwned(userId: string) {
    const business = await this.prisma.business.findUnique({
      where: { ownerUserId: userId },
      select: { id: true, premiumUntil: true },
    });
    if (!business) throw businessRequired();
    return business;
  }

  async getPublic(slug: string): Promise<Business> {
    const row = await this.prisma.business.findFirst({
      where: { slug, ...PUBLIC_OWNER },
      include: businessInclude,
    });
    if (!row) throw notFound();
    return toPublicBusiness(row);
  }

  /** The id of a public business, for its listing tabs. */
  async requirePublicId(id: string): Promise<string> {
    const row = await this.prisma.business.findFirst({
      where: { id, ...PUBLIC_OWNER },
      select: { id: true },
    });
    if (!row) throw notFound();
    return row.id;
  }

  async getMine(userId: string): Promise<MyBusiness> {
    const row = await this.prisma.business.findUnique({
      where: { ownerUserId: userId },
      include: businessInclude,
    });
    if (!row) throw notFound();
    return this.toMyBusiness(row);
  }

  async create(userId: string, input: CreateBusinessInput): Promise<MyBusiness> {
    if (await this.prisma.business.findUnique({ where: { ownerUserId: userId } })) {
      throw businessExists();
    }
    await this.categories.assertBusinessCategories(input.categoryId, input.subcategoryId ?? null);
    const city = await this.places.requireCity(input.cityId, 'body.cityId');

    const fields = {
      tags: input.tags ?? [],
      socials: input.socials ?? {},
      openingHours: input.openingHours ?? [],
      subcategoryId: input.subcategoryId ?? null,
      gstin: input.gstin ?? null,
      about: input.about || null,
      establishedYear: input.establishedYear ?? null,
      website: input.website ?? null,
      contactPerson: input.contactPerson ?? null,
      contactPhone: input.contactPhone ?? null,
      contactEmail: input.contactEmail ?? null,
      address: input.address || null,
      pincode: input.pincode ?? null,
      mapUrl: input.mapUrl ?? null,
    };

    // Owner-chosen slugs must be free; generated ones get a random suffix on collision.
    const candidates = input.slug
      ? [input.slug]
      : [slugify(input.name), ...Array.from({ length: 4 }, () => this.suffixed(input.name))];
    for (const slug of candidates) {
      try {
        const row = await this.prisma.business.create({
          data: {
            ...fields,
            ownerUserId: userId,
            slug,
            name: input.name,
            type: input.type,
            categoryId: input.categoryId,
            cityId: city.id,
            stateId: city.stateId,
            isContactPublic: input.isContactPublic ?? false,
            profileCompletion: profileCompletion(fields),
          },
          include: businessInclude,
        });
        return await this.toMyBusiness(row);
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        if (await this.prisma.business.findUnique({ where: { ownerUserId: userId } })) {
          throw businessExists();
        }
      }
    }
    throw slugTaken();
  }

  async update(userId: string, input: UpdateBusinessInput): Promise<MyBusiness> {
    const current = await this.prisma.business.findUnique({
      where: { ownerUserId: userId },
      include: businessInclude,
    });
    if (!current) throw notFound();

    const data: Prisma.BusinessUncheckedUpdateInput = {};
    for (const field of CLEARABLE_FIELDS) {
      const value = input[field];
      if (value !== undefined) data[field] = value === '' ? null : value;
    }
    if (input.name !== undefined) data.name = input.name;
    if (input.type !== undefined) data.type = input.type;
    if (input.tags !== undefined) data.tags = input.tags;
    if (input.socials !== undefined) data.socials = input.socials;
    if (input.openingHours !== undefined) data.openingHours = input.openingHours;
    if (input.isContactPublic !== undefined) data.isContactPublic = input.isContactPublic;

    if (input.categoryId !== undefined || input.subcategoryId !== undefined) {
      const categoryId = input.categoryId ?? current.categoryId;
      const subcategoryId =
        input.subcategoryId !== undefined ? input.subcategoryId : current.subcategoryId;
      await this.categories.assertBusinessCategories(categoryId, subcategoryId);
      data.categoryId = categoryId;
    }
    if (input.cityId !== undefined) {
      const city = await this.places.requireCity(input.cityId, 'body.cityId');
      data.cityId = city.id;
      data.stateId = city.stateId;
    }
    if (input.slug !== undefined && input.slug !== current.slug) {
      if (current.verifiedAt) throw slugLocked();
      data.slug = input.slug;
    }

    // Product spec, Verification: a new name or GSTIN drops the badge until re-verified.
    const renamed = input.name !== undefined && input.name !== current.name;
    const newGstin = input.gstin !== undefined && input.gstin !== current.gstin;
    if (current.verificationStatus === 'verified' && (renamed || newGstin)) {
      data.verificationStatus = 'none';
    }

    const merged = { ...current, ...readJson(current), ...data } as BusinessData;
    data.profileCompletion = profileCompletion(merged);

    try {
      const row = await this.prisma.business.update({
        where: { id: current.id },
        data,
        include: businessInclude,
      });
      return await this.toMyBusiness(row);
    } catch (error) {
      if (isUniqueViolation(error)) throw slugTaken();
      throw error;
    }
  }

  /** Published products and services, the count the free plan limits. */
  async countPublishedListings(
    businessId: string,
    db: Pick<PrismaClient, 'product' | 'service'> = this.prisma,
  ) {
    // Sequential: inside a transaction both counts share one connection.
    const where = { businessId, status: 'published', deletedAt: null } as const;
    const products = await db.product.count({ where });
    return products + (await db.service.count({ where }));
  }

  private suffixed(name: string) {
    return `${slugify(name).slice(0, 44)}-${randomBytes(4).readUInt32BE().toString(36).slice(0, 5)}`;
  }

  private async toMyBusiness(row: BusinessRow): Promise<MyBusiness> {
    return {
      ...toPublicBusiness(row),
      contactPhone: row.contactPhone,
      contactEmail: row.contactEmail,
      isContactPublic: row.isContactPublic,
      verificationStatus: row.verificationStatus,
      premiumUntil: row.premiumUntil?.toISOString() ?? null,
      profileCompletion: row.profileCompletion,
      publishedListings: await this.countPublishedListings(row.id),
      publishedListingsLimit: publishedListingsLimit(row),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
