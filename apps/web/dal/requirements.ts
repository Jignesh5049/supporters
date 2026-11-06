import 'server-only';
import { type BuyerRequirement, buyerRequirementSchema, pageSchema } from '@supporters/shared';
import { cache } from 'react';
import { apiGet } from './api-fetch';

export const listBuyerRequirements = cache(
  async (
    options: { categoryId?: string; city?: string; limit?: number } = {},
  ): Promise<BuyerRequirement[]> => {
    const params = new URLSearchParams();
    if (options.categoryId) params.set('categoryId', options.categoryId);
    if (options.city) params.set('city', options.city);
    params.set('limit', String(options.limit ?? 20));

    try {
      const res = await apiGet(
        `/v1/buyer-requirements?${params.toString()}`,
        pageSchema(buyerRequirementSchema),
        { withSession: 'optional' },
      );
      return res?.data ?? [];
    } catch {
      return [];
    }
  },
);

export const getBuyerRequirement = cache(
  async (id: string): Promise<BuyerRequirement | null> => {
    try {
      return await apiGet(`/v1/buyer-requirements/${id}`, buyerRequirementSchema, {
        withSession: 'optional',
      });
    } catch {
      return null;
    }
  },
);
