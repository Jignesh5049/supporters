import { REQUIREMENT } from '@supporters/shared';
import type { Prisma } from '../../generated/prisma/client';

export interface MatchResult {
  buyerUserId: string;
  /** Owners of the businesses picked for a notification, best match first. */
  notifyUserIds: string[];
}

/**
 * Finds the businesses a new requirement is shown to and records them in
 * `requirement_matches` (product spec, Buyer requirements: Matching). Runs in
 * the worker, inside the fan-out transaction of `requirement.created`, so it
 * happens once per requirement however often the job is retried.
 *
 * A business matches when it is in the requirement's top-level category, its
 * owner is active, neither side has blocked the other, and it serves the
 * delivery city: the business is in that city, or one of its published
 * products ships to all India or the city's state, or one of its published
 * services covers all India, the state or the city.
 *
 * Rank: Premium first, then verified, then the same subcategory, then a
 * presence in the delivery city, then followers. The best
 * `REQUIREMENT.notifiedBusinessesMax` verified businesses get `notified_at`.
 */
export async function matchRequirement(
  tx: Prisma.TransactionClient,
  requirementId: string,
  now: Date,
): Promise<MatchResult | null> {
  const requirement = await tx.buyerRequirement.findUnique({
    where: { id: requirementId },
    select: { userId: true, status: true, expiresAt: true, matchedAt: true },
  });
  if (!requirement) return null;
  // Closed (or expired) before the job ran: nobody needs to see it.
  if (requirement.status !== 'open' || requirement.expiresAt <= now) {
    return { buyerUserId: requirement.userId, notifyUserIds: [] };
  }

  if (!requirement.matchedAt) {
    await tx.$executeRaw`
      WITH req AS (
        SELECT r.id, r.user_id, r.delivery_city_id, ci.state_id,
          COALESCE(c.parent_id, c.id) AS top_category_id,
          CASE WHEN c.parent_id IS NULL THEN NULL ELSE c.id END AS subcategory_id
        FROM buyer_requirements r
        JOIN categories c ON c.id = r.category_id
        JOIN cities ci ON ci.id = r.delivery_city_id
        WHERE r.id = ${requirementId}::uuid
      ),
      candidates AS (
        SELECT b.id,
          b.verification_status = 'verified' AS is_verified,
          (b.premium_until IS NOT NULL AND b.premium_until > ${now}) AS is_premium,
          (req.subcategory_id IS NOT NULL AND b.subcategory_id = req.subcategory_id) AS is_same_sub,
          b.city_id = req.delivery_city_id AS is_in_city,
          b.follower_count
        FROM businesses b
        CROSS JOIN req
        JOIN users u ON u.id = b.owner_user_id
        WHERE b.category_id = req.top_category_id
          AND u.status = 'active'
          AND b.owner_user_id <> req.user_id
          AND NOT EXISTS (
            SELECT 1 FROM blocks bl
            WHERE (bl.blocker_id = req.user_id AND bl.blocked_id = b.owner_user_id)
               OR (bl.blocker_id = b.owner_user_id AND bl.blocked_id = req.user_id))
          AND (
            b.city_id = req.delivery_city_id
            OR EXISTS (
              SELECT 1 FROM products p
              WHERE p.business_id = b.id AND p.status = 'published' AND p.deleted_at IS NULL
                AND (p.is_all_india OR req.state_id = ANY (p.area_state_ids)))
            OR EXISTS (
              SELECT 1 FROM services s
              WHERE s.business_id = b.id AND s.status = 'published' AND s.deleted_at IS NULL
                AND (s.is_all_india OR req.state_id = ANY (s.area_state_ids)
                  OR req.delivery_city_id = ANY (s.area_city_ids))))
      ),
      ranked AS (
        SELECT id, is_verified,
          row_number() OVER (
            ORDER BY is_premium DESC, is_verified DESC, is_same_sub DESC, is_in_city DESC,
              follower_count DESC, id) AS rank,
          row_number() OVER (
            PARTITION BY is_verified
            ORDER BY is_premium DESC, is_same_sub DESC, is_in_city DESC, follower_count DESC, id
          ) AS rank_in_group
        FROM candidates
      )
      INSERT INTO requirement_matches (requirement_id, business_id, rank, notified_at, updated_at)
      SELECT ${requirementId}::uuid, id, rank,
        CASE WHEN is_verified AND rank_in_group <= ${REQUIREMENT.notifiedBusinessesMax}
          THEN ${now}::timestamptz END,
        ${now}::timestamptz
      FROM ranked
      ON CONFLICT (requirement_id, business_id) DO NOTHING`;
    await tx.buyerRequirement.update({
      where: { id: requirementId },
      data: { matchedAt: now },
    });
  }

  const notified = await tx.requirementMatch.findMany({
    where: { requirementId, notifiedAt: { not: null } },
    orderBy: { rank: 'asc' },
    select: { business: { select: { ownerUserId: true } } },
  });
  return {
    buyerUserId: requirement.userId,
    notifyUserIds: notified.map((match) => match.business.ownerUserId),
  };
}
