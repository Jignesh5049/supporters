import {
  authResponseSchema,
  meSchema,
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
  type SendOtpInput,
} from '@supporters/shared';
import type { ApiClient } from './client';

/** Auth endpoints from the backend spec. Paths are relative to the `/v1` base URL. */
export function createAuthApi(client: ApiClient) {
  return {
    /** 202 with `{ expiresIn, resendAfter }`; the app times the resend from `RATE_LIMITS`. */
    sendOtp: (input: SendOtpInput) =>
      client.request('/auth/otp/send', { method: 'POST', body: input, auth: false }),
    register: (input: RegisterInput) =>
      client.request('/auth/register', {
        method: 'POST',
        body: input,
        auth: false,
        schema: authResponseSchema,
      }),
    login: (input: LoginInput) =>
      client.request('/auth/login', {
        method: 'POST',
        body: input,
        auth: false,
        schema: authResponseSchema,
      }),
    /** Revokes the session that owns this refresh token; works with an expired access token. */
    logout: (refreshToken: string) =>
      client.request('/auth/logout', { method: 'POST', body: { refreshToken }, auth: false }),
    resetPassword: (input: ResetPasswordInput) =>
      client.request('/auth/password/reset', { method: 'POST', body: input, auth: false }),
    me: () => client.request('/me', { schema: meSchema }),
  };
}

export type AuthApi = ReturnType<typeof createAuthApi>;
