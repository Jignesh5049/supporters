import { z } from 'zod';

/** The Razorpay events this module acts on (backend spec, Payments and money). Others are acknowledged and logged. */
export const HANDLED_EVENTS = [
  'subscription.charged',
  'subscription.halted',
  'subscription.cancelled',
  'payment.failed',
  'refund.processed',
] as const;
export type HandledEvent = (typeof HANDLED_EVENTS)[number];
export const isHandledEvent = (event: string): event is HandledEvent =>
  (HANDLED_EVENTS as readonly string[]).includes(event);

/** The outer shell of every delivery. */
export const webhookEnvelopeSchema = z.looseObject({
  event: z.string().min(1).max(100),
  /** Unix seconds, set by Razorpay. The only timestamp a delivery carries. */
  created_at: z.number().int().positive(),
  payload: z.record(z.string(), z.unknown()).default({}),
});

const entityOf = <T extends z.ZodType>(schema: T) => z.looseObject({ entity: schema });

const subscriptionEntitySchema = z.looseObject({
  id: z.string().min(1).max(100),
  status: z.string().optional(),
  current_start: z.number().int().nullish(),
  current_end: z.number().int().nullish(),
});

const paymentEntitySchema = z.looseObject({
  id: z.string().min(1).max(100),
  amount: z.number().int().min(0),
  currency: z.string().length(3),
  status: z.string().optional(),
  error_code: z.string().nullish(),
  subscription_id: z.string().nullish(),
  // Razorpay sends [] for empty notes, so accept anything and read it defensively.
  notes: z.unknown().optional(),
});

const refundEntitySchema = z.looseObject({
  id: z.string().min(1).max(100),
  payment_id: z.string().min(1).max(100),
  amount: z.number().int().min(0),
});

const payloadSchema = z.looseObject({
  subscription: entityOf(subscriptionEntitySchema).optional(),
  payment: entityOf(paymentEntitySchema).optional(),
  refund: entityOf(refundEntitySchema).optional(),
});

/**
 * What the handlers keep of a delivery: ids, amounts and periods. Customer details in Razorpay's
 * payloads (email, phone, card and UPI details) are dropped here, before anything is stored.
 */
export interface EventData {
  subscription?: { id: string; currentStart: string | null; currentEnd: string | null };
  payment?: {
    id: string;
    amountPaise: number;
    currency: string;
    errorCode: string | null;
    subscriptionId: string | null;
  };
  refund?: { id: string; paymentId: string; amountPaise: number };
}

const iso = (seconds: number | null | undefined) =>
  seconds ? new Date(seconds * 1000).toISOString() : null;

const noteSubscriptionId = (notes: unknown): string | null => {
  if (typeof notes !== 'object' || notes === null || Array.isArray(notes)) return null;
  const value = (notes as Record<string, unknown>).subscription_id;
  return typeof value === 'string' ? value : null;
};

/** Minimises a handled event's payload, or returns null when a field the handler needs is missing. */
export function extractEventData(event: HandledEvent, payload: unknown): EventData | null {
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) return null;
  const { subscription, payment, refund } = parsed.data;
  const data: EventData = {};
  if (subscription) {
    data.subscription = {
      id: subscription.entity.id,
      currentStart: iso(subscription.entity.current_start),
      currentEnd: iso(subscription.entity.current_end),
    };
  }
  if (payment) {
    data.payment = {
      id: payment.entity.id,
      amountPaise: payment.entity.amount,
      currency: payment.entity.currency,
      errorCode: payment.entity.error_code ?? null,
      subscriptionId: payment.entity.subscription_id ?? noteSubscriptionId(payment.entity.notes),
    };
  }
  if (refund) {
    data.refund = {
      id: refund.entity.id,
      paymentId: refund.entity.payment_id,
      amountPaise: refund.entity.amount,
    };
  }
  switch (event) {
    case 'subscription.charged':
      return data.subscription && data.payment ? data : null;
    case 'subscription.halted':
    case 'subscription.cancelled':
      return data.subscription ? data : null;
    case 'payment.failed':
      return data.payment ? data : null;
    case 'refund.processed':
      return data.refund ? data : null;
  }
}
