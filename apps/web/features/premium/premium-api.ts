import type {
  Invoice,
  InvoiceDetail,
  KeepListingsInput,
  PremiumCheckoutInput,
  PremiumCheckoutResult,
  PremiumListings,
  PremiumStatus,
} from '@supporters/shared';
import { api } from '@/lib/api/client';

/** Premium (web spec, Mutations: Premium checkout). Status always comes from the API, never from Checkout. */

export const PREMIUM_KEY = ['premium'] as const;
export const INVOICES_KEY = ['premium-invoices'] as const;
export const LISTINGS_KEY = ['premium-listings'] as const;

export const fetchPremium = () => api.request<PremiumStatus>('/v1/me/business/premium');

/** One Idempotency-Key per purchase attempt: a double click or a retry reuses the subscription. */
export const startCheckout = (body: PremiumCheckoutInput, idempotencyKey: string) =>
  api.request<PremiumCheckoutResult>('/v1/me/business/premium/checkout', {
    method: 'POST',
    body,
    headers: { 'idempotency-key': idempotencyKey },
  });

export const cancelPremium = () =>
  api.request<PremiumStatus>('/v1/me/business/premium/cancel', { method: 'POST' });

export const fetchInvoices = () =>
  api.request<{ data: Invoice[]; nextCursor: string | null }>('/v1/me/business/invoices?limit=50');

export const fetchInvoice = (id: string) =>
  api.request<InvoiceDetail>(`/v1/me/business/invoices/${id}`);

export const fetchListings = () => api.request<PremiumListings>('/v1/me/business/premium/listings');

export const keepListings = (body: KeepListingsInput) =>
  api.request<PremiumListings>('/v1/me/business/premium/listings', { method: 'PUT', body });

/** Development only: the API registers this route only with the fake payment provider. */
export const completeFakeCheckout = (subscriptionId: string) =>
  api.request<PremiumStatus>('/v1/dev/payments/fake/complete', {
    method: 'POST',
    body: { subscriptionId },
  });
