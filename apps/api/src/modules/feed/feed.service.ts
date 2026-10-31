import type { FeedItem, FeedQuery, FeedSource, Page } from '@supporters/shared';
import { z } from 'zod';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { invalidField } from '../../lib/errors';
import { afterTimeCursor } from '../../lib/pagination';
import type { PlacesService } from '../places/places.service';
import {
  PUBLIC_POST,
  PUBLISHED_ORDER,
  type PostRow,
  type PostsService,
  postInclude,
} from '../posts/posts.service';

/** One part of the feed, read newest first until it runs out. */
interface Stage {
  source: FeedSource;
  where: Prisma.PostWhereInput;
}

interface FeedPosition {
  stage: number;
  at: Date;
  id: string;
}

/** The cursor names the stage and the last (published_at, id) read in it. */
const cursorSchema = z.object({ s: z.number().int().min(0), t: z.iso.datetime(), i: z.uuid() });

const encodeFeedCursor = (position: FeedPosition) =>
  Buffer.from(
    JSON.stringify({ s: position.stage, t: position.at.toISOString(), i: position.id }),
    'utf8',
  ).toString('base64url');

function decodeFeedCursor(cursor: string | undefined): FeedPosition | undefined {
  if (cursor === undefined) return undefined;
  let parsed: z.ZodSafeParseResult<z.infer<typeof cursorSchema>>;
  try {
    parsed = cursorSchema.safeParse(JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')));
  } catch {
    throw invalidField('query.cursor', 'Invalid cursor');
  }
  if (!parsed.success) throw invalidField('query.cursor', 'Invalid cursor');
  return { stage: parsed.data.s, at: new Date(parsed.data.t), id: parsed.data.i };
}

/**
 * The home feed (product spec, Feed and social). Signed in: newest posts from
 * followed businesses, then, once those run out, newest posts from the user's
 * city and then the rest of their state, in their interest categories,
 * skipping posts they have seen. Guests: newest posts in a city, or All India.
 */
export class FeedService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly posts: PostsService,
    private readonly places: PlacesService,
  ) {}

  async feed(viewerId: string | null, query: FeedQuery): Promise<Page<FeedItem>> {
    const stages = viewerId ? await this.userStages(viewerId) : await this.guestStages(query.city);
    const start = decodeFeedCursor(query.cursor);
    if (start && start.stage >= stages.length) throw invalidField('query.cursor', 'Invalid cursor');

    // Read stages in order until one more row than a page, so we know whether another follows.
    const want = query.limit + 1;
    const collected: { row: PostRow; stage: number }[] = [];
    for (let index = start?.stage ?? 0; index < stages.length; index += 1) {
      const stage = stages[index];
      if (!stage) break;
      const after = start && index === start.stage ? start : undefined;
      const rows = await this.prisma.post.findMany({
        where: { AND: [PUBLIC_POST, stage.where, afterTimeCursor(after)] },
        orderBy: PUBLISHED_ORDER,
        take: want - collected.length,
        include: postInclude,
      });
      collected.push(...rows.map((row) => ({ row, stage: index })));
      if (collected.length >= want) break;
    }

    const page = collected.slice(0, query.limit);
    const posts = await this.posts.toPosts(
      page.map((item) => item.row),
      viewerId,
    );
    const last = page.at(-1);
    return {
      data: posts.map((post, index) => ({
        ...post,
        source: stages[page[index]?.stage ?? 0]?.source ?? 'all_india',
      })),
      nextCursor:
        collected.length > query.limit && last?.row.publishedAt
          ? encodeFeedCursor({ stage: last.stage, at: last.row.publishedAt, id: last.row.id })
          : null,
    };
  }

  /** Records posts the client showed, so the fill stages skip them. Unknown ids are ignored. */
  async markSeen(userId: string, postIds: string[]): Promise<void> {
    const posts = await this.prisma.post.findMany({
      where: { id: { in: postIds }, ...PUBLIC_POST },
      select: { id: true },
    });
    await this.prisma.feedSeen.createMany({
      data: posts.map((post) => ({ userId, postId: post.id })),
      skipDuplicates: true,
    });
  }

  private async userStages(userId: string): Promise<Stage[]> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        cityId: true,
        city: { select: { stateId: true } },
        interests: { select: { categoryId: true } },
      },
    });
    const following: Stage = {
      source: 'following',
      where: { business: { followers: { some: { userId } } } },
    };

    // Interests can be categories or subcategories; no interests means any category.
    const categoryIds = user.interests.map((interest) => interest.categoryId);
    const inInterests: Prisma.BusinessWhereInput =
      categoryIds.length > 0
        ? { OR: [{ categoryId: { in: categoryIds } }, { subcategoryId: { in: categoryIds } }] }
        : {};
    const fill = (business: Prisma.BusinessWhereInput): Prisma.PostWhereInput => ({
      seenBy: { none: { userId } },
      business: { AND: [{ followers: { none: { userId } } }, inInterests, business] },
    });

    if (!user.cityId || !user.city) {
      return [following, { source: 'all_india', where: fill({}) }];
    }
    return [
      following,
      { source: 'city', where: fill({ cityId: user.cityId }) },
      {
        source: 'state',
        where: fill({ stateId: user.city.stateId, cityId: { not: user.cityId } }),
      },
    ];
  }

  private async guestStages(cityId: string | undefined): Promise<Stage[]> {
    if (!cityId) return [{ source: 'all_india', where: {} }];
    const city = await this.places.requireCity(cityId, 'query.city');
    return [{ source: 'city', where: { business: { cityId: city.id } } }];
  }
}
