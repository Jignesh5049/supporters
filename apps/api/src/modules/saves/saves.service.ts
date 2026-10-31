import type { Page, SaveState, SaveTargetType, SavedItem, SavesQuery } from '@supporters/shared';
import type { PrismaClient } from '../../generated/prisma/client';
import { encodeCursor, pageArgs } from '../../lib/pagination';
import type { BusinessesService } from '../businesses/businesses.service';
import type { PostsService } from '../posts/posts.service';
import type { ProductsService } from '../products/products.service';
import type { ServicesService } from '../services/services.service';

/**
 * Which of `ids` the user saved. Separate from SavesService so the posts
 * module can show `isSaved` without depending on the whole saves module.
 */
export class SaveLookup {
  constructor(private readonly prisma: PrismaClient) {}

  async savedIds(userId: string, type: SaveTargetType, ids: string[]): Promise<Set<string>> {
    const rows = await this.prisma.save.findMany({
      where: { userId, targetType: type, targetId: { in: ids } },
      select: { targetId: true },
    });
    return new Set(rows.map((row) => row.targetId));
  }
}

export class SavesService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly posts: PostsService,
    private readonly products: ProductsService,
    private readonly services: ServicesService,
    private readonly businesses: BusinessesService,
  ) {}

  /**
   * Idempotent save or unsave. Only public targets can be saved; unsaving
   * works even after the target is gone, so users can clear dead bookmarks.
   * A post's save counter moves in the same transaction as the row.
   */
  async setSaved(
    userId: string,
    type: SaveTargetType,
    targetId: string,
    isSaved: boolean,
  ): Promise<SaveState> {
    if (isSaved) await this.requirePublicTarget(type, targetId);
    await this.prisma.$transaction(async (tx) => {
      const { count } = isSaved
        ? await tx.save.createMany({
            data: [{ userId, targetType: type, targetId }],
            skipDuplicates: true,
          })
        : await tx.save.deleteMany({ where: { userId, targetType: type, targetId } });
      if (count > 0 && type === 'post') {
        await this.posts.adjustCounter(tx, targetId, 'saveCount', isSaved ? 1 : -1);
      }
    });
    return { isSaved };
  }

  /** The Saved list, newest first, optionally one type tab. */
  async list(userId: string, query: SavesQuery): Promise<Page<SavedItem>> {
    const page = pageArgs(query.cursor, query.limit);
    const rows = await this.prisma.save.findMany({
      ...page,
      where: { ...page.where, userId, ...(query.type ? { targetType: query.type } : {}) },
    });
    const pageRows = rows.slice(0, query.limit);
    const idsOf = (type: SaveTargetType) =>
      pageRows.filter((row) => row.targetType === type).map((row) => row.targetId);

    const [posts, products, services, businesses] = await Promise.all([
      this.posts.getPublicMany(idsOf('post'), userId),
      this.products.getPublicMany(idsOf('product')),
      this.services.getPublicMany(idsOf('service')),
      this.businesses.getSummaries(idsOf('business')),
    ]);
    const byId = <T extends { id: string }>(items: T[]) =>
      new Map(items.map((item) => [item.id, item]));
    const targets = {
      post: byId(posts),
      product: byId(products),
      service: byId(services),
      business: byId(businesses),
    };

    // Targets that are no longer public drop out; the cursor still moves past them.
    const data = pageRows.flatMap((row): SavedItem[] => {
      const base = { id: row.id, savedAt: row.createdAt.toISOString() };
      switch (row.targetType) {
        case 'post': {
          const post = targets.post.get(row.targetId);
          return post ? [{ ...base, type: 'post', post }] : [];
        }
        case 'product': {
          const product = targets.product.get(row.targetId);
          return product ? [{ ...base, type: 'product', product }] : [];
        }
        case 'service': {
          const service = targets.service.get(row.targetId);
          return service ? [{ ...base, type: 'service', service }] : [];
        }
        case 'business': {
          const business = targets.business.get(row.targetId);
          return business ? [{ ...base, type: 'business', business }] : [];
        }
      }
    });
    const last = pageRows.at(-1);
    return { data, nextCursor: rows.length > query.limit && last ? encodeCursor(last.id) : null };
  }

  private async requirePublicTarget(type: SaveTargetType, id: string) {
    switch (type) {
      case 'post':
        await this.posts.requirePublicId(id);
        return;
      case 'product':
        await this.products.getPublic(id);
        return;
      case 'service':
        await this.services.getPublic(id);
        return;
      case 'business':
        await this.businesses.requirePublicId(id);
        return;
    }
  }
}
