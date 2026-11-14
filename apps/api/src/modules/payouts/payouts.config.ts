import type { Env } from '../../config/env';
import { AppError, ErrorCode } from '../../lib/errors';
import { FakePayouts } from './payouts.fake';
import type { PayoutsProvider } from './payouts.provider';
import { RazorpayXPayouts } from './payouts.razorpayx';
import { PayoutVault } from './payouts.vault';

/** The provider and the key that protects payout details. Both are null until configured. */
export interface PayoutsRuntime {
  provider: PayoutsProvider;
  vault: PayoutVault;
}

/**
 * Builds the payouts runtime from the environment, or null when payouts are off. The app boots
 * either way. `env` validation already refuses the fake provider in staging and production.
 */
export function createPayoutsRuntime(env: Env, override?: PayoutsProvider): PayoutsRuntime | null {
  if (!env.PAYOUTS_PROVIDER || !env.PAYOUT_ENCRYPTION_KEY) return null;
  const vault = new PayoutVault(env.PAYOUT_ENCRYPTION_KEY);
  if (env.PAYOUTS_PROVIDER === 'fake') return { provider: override ?? new FakePayouts(), vault };
  if (!env.RAZORPAYX_KEY_ID || !env.RAZORPAYX_KEY_SECRET || !env.RAZORPAYX_ACCOUNT_NUMBER) {
    return null;
  }
  return {
    provider:
      override ??
      new RazorpayXPayouts({
        keyId: env.RAZORPAYX_KEY_ID,
        keySecret: env.RAZORPAYX_KEY_SECRET,
        accountNumber: env.RAZORPAYX_ACCOUNT_NUMBER,
      }),
    vault,
  };
}

/** Every payout endpoint calls this first: 503 with a stable code while payouts are off. */
export function requirePayouts(runtime: PayoutsRuntime | null): PayoutsRuntime {
  if (!runtime) {
    throw new AppError(503, ErrorCode.PayoutsNotConfigured, 'Payouts are not available yet', {
      detail: 'Withdrawals will open once payouts are set up.',
    });
  }
  return runtime;
}
