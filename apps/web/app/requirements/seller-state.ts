import 'server-only';
import { getMyBusiness } from '@/dal/my-business';
import type { SellerState } from '@/features/requirements/requirements-screen';

/** Whether the signed-in user has a business, and whether it may quote. */
export async function getSellerState(): Promise<SellerState> {
  const business = await getMyBusiness();
  return {
    hasBusiness: business !== null,
    isVerified: business?.verificationStatus === 'verified',
  };
}
