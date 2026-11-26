import { type PayoutAccount, type PutPayoutAccountInput, WALLET } from '@supporters/shared';
import type {
  PayoutAccount as PayoutAccountRow,
  PrismaClient,
} from '../../generated/prisma/client';
import { AppError, ErrorCode, rateLimited } from '../../lib/errors';
import { isNameMatch } from '../../lib/name-match';
import type { SlidingWindowLimiter } from '../../lib/sliding-window';
import { recordEvent } from '../notifications/outbox';
import { auditMoney, lockWallet } from '../wallet/wallet.ledger';
import { type PayoutsRuntime, requirePayouts } from './payouts.config';
import { maskDestination } from './payouts.vault';

const HOUR_MS = 3_600_000;

export const toPayoutAccount = (row: PayoutAccountRow): PayoutAccount => ({
  method: row.method,
  holderName: row.holderName,
  maskedDestination: row.maskedDestination,
  validationStatus: row.validationStatus,
  isNameMatch: row.isNameMatch,
  updatedAt: row.createdAt.toISOString(),
  withdrawalsAllowedAt: new Date(
    row.createdAt.getTime() + WALLET.payoutDetailsCooldownHours * HOUR_MS,
  ).toISOString(),
});

export class PayoutAccountService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly runtime: PayoutsRuntime | null,
    private readonly limiter: SlidingWindowLimiter,
  ) {}

  /** `GET /me/payout-account`: the live version, masked, or null. */
  async get(userId: string): Promise<PayoutAccount | null> {
    const row = await this.prisma.payoutAccount.findFirst({
      where: { userId, supersededAt: null },
    });
    return row ? toPayoutAccount(row) : null;
  }

  /**
   * `PUT /me/payout-account`. RazorpayX validates the account and returns the name the bank holds;
   * that name (or the typed one) is compared with the profile name. The details are sealed with
   * AES-256-GCM and never leave this method in the clear. Any real change starts the 24-hour
   * withdrawal cooldown and sends the always-on security notification; sending the same details
   * again changes nothing.
   */
  async put(
    userId: string,
    input: PutPayoutAccountInput,
    audit: { ip: string; userAgent: string | null },
  ): Promise<PayoutAccount> {
    const { provider, vault } = requirePayouts(this.runtime);
    const limit = await this.limiter.hit(`payout-account:${userId}`, 5, 3_600);
    if (!limit.allowed) throw rateLimited(Math.max(1, Math.ceil(limit.resetMs / 1000)));

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true, status: true },
    });
    if (user.status !== 'active') {
      throw new AppError(403, ErrorCode.AccountSuspended, 'This account is suspended');
    }

    const destination = input;
    const fingerprint = vault.fingerprint(destination);
    const live = await this.prisma.payoutAccount.findFirst({
      where: { userId, supersededAt: null },
    });
    if (
      live &&
      live.destinationHash === fingerprint &&
      live.holderName === input.holderName &&
      live.validationStatus !== 'failed'
    ) {
      return toPayoutAccount(live);
    }

    const validation = await provider.validateAccount({ userId, destination });
    if (validation.status === 'failed') {
      throw new AppError(422, ErrorCode.PayoutAccountInvalid, 'We could not verify this account', {
        detail: 'Check the details with your bank or UPI app and try again.',
      });
    }
    const isMatch = isNameMatch(user.name, validation.registeredName ?? input.holderName);

    const created = await this.prisma.$transaction(async (tx) => {
      // Serialises with withdrawals: a request in flight sees either the old or the new version.
      await lockWallet(tx, userId);
      await tx.payoutAccount.updateMany({
        where: { userId, supersededAt: null },
        data: { supersededAt: new Date() },
      });
      const row = await tx.payoutAccount.create({
        data: {
          userId,
          method: input.method,
          holderName: input.holderName,
          registeredName: validation.registeredName,
          destinationEnc: vault.seal(userId, destination),
          destinationHash: fingerprint,
          maskedDestination: maskDestination(destination),
          validationStatus: validation.status,
          isNameMatch: isMatch,
          providerFundAccountId: validation.fundAccountId,
          providerValidationId: validation.validationId,
        },
      });
      await auditMoney(
        tx,
        { userId, kind: 'user', ip: audit.ip, userAgent: audit.userAgent },
        {
          action: 'wallet.payout_account_set',
          targetType: 'payout_account',
          targetId: row.id,
          // Never the destination itself.
          metadata: {
            method: row.method,
            validationStatus: row.validationStatus,
            isNameMatch: row.isNameMatch,
            replaced: live?.id ?? null,
          },
        },
      );
      await recordEvent(tx, 'security.payout_details_changed', { userId });
      return row;
    });
    return toPayoutAccount(created);
  }
}
