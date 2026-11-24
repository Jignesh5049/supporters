import {
  loginSchema,
  otpCodeSchema,
  passwordSchema,
  phoneSchema,
  referralCodeSchema,
  registerSchema,
} from '@supporters/shared';
import { z } from 'zod';
import { toE164 } from './pending-flow';

/** Form-only rules on top of the shared API schemas: phone formatting and password confirmation. */
const typedPhone = z.string().transform(toE164).pipe(phoneSchema);
const mismatch = { path: ['confirmPassword'], message: 'Passwords do not match' };

export const registerFormSchema = registerSchema
  .pick({ name: true, password: true })
  .extend({
    phone: typedPhone,
    confirmPassword: z.string(),
    /** Optional; blank is no code. Checked with the API's own rule. */
    referralCode: z
      .string()
      .trim()
      .transform((value) => (value === '' ? undefined : value))
      .pipe(referralCodeSchema.optional()),
  })
  .refine((value) => value.password === value.confirmPassword, mismatch);

export const otpFormSchema = z.object({ otp: otpCodeSchema });

export const loginFormSchema = loginSchema.extend({
  /** A typed 10-digit number is sent as +91; anything else (an email) as typed. */
  identifier: loginSchema.shape.identifier.transform(toE164),
});

export const forgotPasswordFormSchema = z.object({ phone: typedPhone });

export const resetPasswordFormSchema = z
  .object({ otp: otpCodeSchema, newPassword: passwordSchema, confirmPassword: z.string() })
  .refine((value) => value.newPassword === value.confirmPassword, mismatch);
