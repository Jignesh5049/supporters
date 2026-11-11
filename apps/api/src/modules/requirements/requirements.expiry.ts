import type { PrismaClient } from '../../generated/prisma/client';

const BATCH = 1_000;

/**
 * The hourly cron: open requirements past `expires_at` become expired
 * (product spec, Buyer requirements: open for 30 days). Reads already treat
 * them as expired from that moment, so this only makes the stored status
 * catch up. Works in batches to keep each lock short.
 */
export async function expireRequirements(prisma: PrismaClient, now = new Date()): Promise<number> {
  let total = 0;
  for (;;) {
    const updated = await prisma.$executeRaw`
      UPDATE buyer_requirements SET status = 'expired', closed_at = expires_at, updated_at = ${now}
      WHERE id IN (
        SELECT id FROM buyer_requirements
        WHERE status = 'open' AND expires_at <= ${now}
        LIMIT ${BATCH} FOR UPDATE SKIP LOCKED)`;
    total += updated;
    if (updated < BATCH) return total;
  }
}
