import { premiumStatusSchema, type PremiumStatus } from '@supporters/shared';
import type { ApiClient } from './client';

/**
 * Premium is bought on the web only (Google Play and App Store billing rules), so the app can read
 * the status and nothing else: there is deliberately no checkout, cancel or invoice call here.
 */
export interface PremiumApi {
  getStatus(): Promise<PremiumStatus>;
}

export function createPremiumApi(client: ApiClient): PremiumApi {
  return {
    getStatus: () => client.request('/me/business/premium', { schema: premiumStatusSchema }),
  };
}
