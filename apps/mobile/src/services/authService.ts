import {
  CURRENT_POLICY_VERSION,
  OtpPurpose,
  emailSchema,
  loginSchema,
  personNameSchema,
  phoneSchema,
  type Me,
} from '@supporters/shared';
import { ApiError, authApi, messageForError } from '../lib/api';
import { completeSignIn, signOut as endSession } from '../lib/auth/session';

export type OtpPurposeValue = (typeof OtpPurpose)[keyof typeof OtpPurpose];

export interface SignInCredentials {
  /** A 10-digit or +91 mobile number, or an email. */
  identifier: string;
  password: string;
}

export interface SignUpData {
  name: string;
  phone: string;
  password: string;
  otp: string;
}

export interface ResetPasswordData {
  phone: string;
  otp: string;
  newPassword: string;
}

export interface AuthResult {
  success: boolean;
  user?: Me;
  /** Problem-details code, for screens that react to a specific failure. */
  code?: string;
  error?: string;
}

/** Turns a 10-digit Indian mobile number (spaces allowed) into E.164; returns null if invalid. */
export function toE164Phone(input: string): string | null {
  const digits = input.replace(/[\s-]/g, '').replace(/^(\+91|91|0)(?=\d{10}$)/, '');
  const phone = `+91${digits}`;
  return phoneSchema.safeParse(phone).success ? phone : null;
}

/** Login accepts a mobile number or an email; normalise either before sending. */
export function toLoginIdentifier(input: string): string | null {
  const phone = toE164Phone(input);
  if (phone) return phone;
  const email = emailSchema.safeParse(input.trim());
  return email.success ? email.data : null;
}

export function validateName(name: string): boolean {
  return personNameSchema.safeParse(name).success;
}

async function run(action: () => Promise<Me | void>): Promise<AuthResult> {
  try {
    const user = await action();
    return user ? { success: true, user } : { success: true };
  } catch (error) {
    const code = error instanceof ApiError ? error.code : undefined;
    return { success: false, code, error: messageForError(error) };
  }
}

/** Auth calls for the screens. Inputs are validated by the screens with the shared schemas. */
export const authService = {
  requestOtp: (purpose: OtpPurposeValue, phone: string) =>
    run(() => authApi.sendOtp({ purpose, phone })),

  signUp: (data: SignUpData) =>
    run(async () =>
      completeSignIn(
        await authApi.register({
          name: data.name.trim(),
          phone: data.phone,
          password: data.password,
          otp: data.otp,
          policyVersion: CURRENT_POLICY_VERSION,
        }),
      ),
    ),

  signIn: (credentials: SignInCredentials) =>
    run(async () => {
      const input = loginSchema.parse({
        identifier: toLoginIdentifier(credentials.identifier) ?? credentials.identifier,
        password: credentials.password,
      });
      return completeSignIn(await authApi.login(input));
    }),

  resetPassword: (data: ResetPasswordData) => run(() => authApi.resetPassword(data)),

  signOut: endSession,
};
