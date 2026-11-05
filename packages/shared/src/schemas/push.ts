import { z } from 'zod';

// Push registration (backend spec, endpoint map: Notifications). Expo push on mobile, and
// Web Push (opt-in from Settings) in browsers.

/** `ExponentPushToken[...]` from `getExpoPushTokenAsync()`. */
export const expoPushTokenSchema = z
  .string()
  .max(200)
  .regex(/^Expo(nent)?PushToken\[[\w-]{8,160}\]$/, 'Not an Expo push token');

export const registerPushTokenSchema = z.strictObject({
  token: expoPushTokenSchema,
  platform: z.enum(['android', 'ios']),
});
export type RegisterPushTokenInput = z.infer<typeof registerPushTokenSchema>;

export const deletePushTokenSchema = z.strictObject({ token: expoPushTokenSchema });
export type DeletePushTokenInput = z.infer<typeof deletePushTokenSchema>;

const base64url = (min: number, max: number) =>
  z
    .string()
    .min(min)
    .max(max)
    .regex(/^[\w-]+=*$/, 'Must be base64url');

const pushEndpointSchema = z.url({ protocol: /^https$/ }).max(2_048);

/** `PushSubscription.toJSON()` from the browser. */
export const webPushSubscriptionSchema = z.strictObject({
  endpoint: pushEndpointSchema,
  expirationTime: z.number().nullable().optional(),
  keys: z.strictObject({
    /** The client's P-256 public key: 65 bytes. */
    p256dh: base64url(86, 88),
    /** The 16-byte auth secret. */
    auth: base64url(22, 24),
  }),
});
export type WebPushSubscriptionInput = z.infer<typeof webPushSubscriptionSchema>;

export const deleteWebPushSubscriptionSchema = z.strictObject({ endpoint: pushEndpointSchema });
export type DeleteWebPushSubscriptionInput = z.infer<typeof deleteWebPushSubscriptionSchema>;

/** The VAPID application server key for `pushManager.subscribe`; null when web push is off. */
export const vapidPublicKeySchema = z.object({ publicKey: z.string().nullable() });
export type VapidPublicKey = z.infer<typeof vapidPublicKeySchema>;

/**
 * The `data` of every push, mobile and web. Ids only: no names, message text
 * or contact details. The client fetches the item to show more.
 */
export const pushDataSchema = z.object({
  notificationId: z.uuid(),
  type: z.string(),
  targetType: z.string(),
  targetId: z.uuid().nullable(),
});
export type PushData = z.infer<typeof pushDataSchema>;
