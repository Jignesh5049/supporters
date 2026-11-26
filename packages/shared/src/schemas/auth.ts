import { z } from 'zod';
import { ACCOUNT_LIMITS, OTP, TEXT_LIMITS } from '../limits';

/** Indian mobile numbers in E.164: +91 followed by 10 digits starting 6-9. */
export const phoneSchema = z.string().regex(/^\+91[6-9]\d{9}$/, 'Enter a +91 mobile number');

export const emailSchema = z
  .email()
  .max(ACCOUNT_LIMITS.emailMax)
  .transform((value) => value.toLowerCase());

/** New passwords: length only, no composition rules (backend spec, Security). */
export const passwordSchema = z
  .string()
  .min(ACCOUNT_LIMITS.password.min)
  .max(ACCOUNT_LIMITS.password.max);

/** Referral codes: 8 characters from an unambiguous alphabet, matched case-insensitively. */
export const REFERRAL_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const REFERRAL_CODE_LENGTH = 8;
export const referralCodeSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(z.string().regex(new RegExp(`^[${REFERRAL_CODE_ALPHABET}]{${REFERRAL_CODE_LENGTH}}$`)));

export const otpCodeSchema = z.string().regex(new RegExp(`^\\d{${OTP.digits}}$`), 'Enter the code');

export const personNameSchema = z
  .string()
  .trim()
  .min(TEXT_LIMITS.personName.min)
  .max(TEXT_LIMITS.personName.max);

/** Terms and privacy policy version shown at signup; recorded as DPDP consent. */
export const CURRENT_POLICY_VERSION = '2026-10-28';

export const OtpPurpose = { Signup: 'signup', Reset: 'reset' } as const;

export const sendOtpSchema = z.strictObject({
  purpose: z.enum([OtpPurpose.Signup, OtpPurpose.Reset]),
  phone: phoneSchema,
});
export type SendOtpInput = z.infer<typeof sendOtpSchema>;

export const registerSchema = z.strictObject({
  name: personNameSchema,
  phone: phoneSchema,
  password: passwordSchema,
  otp: otpCodeSchema,
  /** Version of the terms and privacy policy shown at signup. */
  policyVersion: z.string().min(1).max(32),
  /** A friend's referral code. Signup only: it can't be added later (product spec, Referral). */
  referralCode: referralCodeSchema.optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.strictObject({
  /** A +91 mobile number or a verified email. */
  identifier: z.string().trim().min(1).max(ACCOUNT_LIMITS.emailMax),
  /** Not length-checked beyond the cap, so older passwords keep working. */
  password: z.string().min(1).max(ACCOUNT_LIMITS.password.max),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Mobile clients send the refresh token in the body; web sends the cookie. */
export const refreshSchema = z.strictObject({
  refreshToken: z.string().min(1).max(128).optional(),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

export const logoutSchema = refreshSchema;
export type LogoutInput = z.infer<typeof logoutSchema>;

export const resetPasswordSchema = z.strictObject({
  phone: phoneSchema,
  otp: otpCodeSchema,
  newPassword: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const meSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  emailVerified: z.boolean(),
  role: z.enum(['user', 'admin']),
  cityId: z.uuid().nullable(),
  createdAt: z.iso.datetime(),
});
export type Me = z.infer<typeof meSchema>;

/** Returned to mobile clients (`X-Client: mobile`) only; web gets cookies. */
export const mobileTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int(),
});
export type MobileTokens = z.infer<typeof mobileTokensSchema>;

/** Login and register: the user, plus the token fields for mobile clients only. */
export const authResponseSchema = z
  .object({ user: meSchema })
  .extend(mobileTokensSchema.partial().shape);
export type AuthResponse = z.infer<typeof authResponseSchema>;
