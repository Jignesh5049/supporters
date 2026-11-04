import type { BlockState } from '@supporters/shared';
import type { PrismaClient } from '../../generated/prisma/client';
import { invalidField, notFound } from '../../lib/errors';

/**
 * A block works both ways: neither side can message the other, and the thread
 * is hidden from whoever blocked (product spec, Messaging: Controls).
 */
export class BlocksService {
  constructor(private readonly prisma: PrismaClient) {}

  /** Idempotent. The target must be an existing account. */
  async setBlocked(blockerId: string, targetId: string, isBlocked: boolean): Promise<BlockState> {
    if (blockerId === targetId) throw invalidField('params.userId', 'You cannot block yourself');
    if (isBlocked) {
      const target = await this.prisma.user.findFirst({
        where: { id: targetId, status: { not: 'deleted' } },
        select: { id: true },
      });
      if (!target) throw notFound();
      await this.prisma.block.createMany({
        data: [{ blockerId, blockedId: targetId }],
        skipDuplicates: true,
      });
    } else {
      await this.prisma.block.deleteMany({ where: { blockerId, blockedId: targetId } });
    }
    return { isBlocked };
  }

  /** Whether either of the two has blocked the other. */
  async isBlockedEitherWay(a: string, b: string): Promise<boolean> {
    const count = await this.prisma.block.count({
      where: {
        OR: [
          { blockerId: a, blockedId: b },
          { blockerId: b, blockedId: a },
        ],
      },
    });
    return count > 0;
  }
}
