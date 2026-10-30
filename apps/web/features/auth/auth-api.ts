'use client';

import {
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
  type SendOtpInput,
  authResponseSchema,
} from '@supporters/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';

interface OtpSent {
  expiresIn: number;
  resendAfter: number;
}

const signedInUser = async (promise: Promise<unknown>) =>
  authResponseSchema.parse(await promise).user;

export const authApi = {
  sendOtp: (input: SendOtpInput) =>
    api.request<OtpSent>('/v1/auth/otp/send', { method: 'POST', body: input }),
  register: (input: RegisterInput) =>
    signedInUser(api.request('/v1/auth/register', { method: 'POST', body: input })),
  login: (input: LoginInput) =>
    signedInUser(api.request('/v1/auth/login', { method: 'POST', body: input })),
  resetPassword: (input: ResetPasswordInput) =>
    api.request('/v1/auth/password/reset', { method: 'POST', body: input }),
  logout: () => api.request('/v1/auth/logout', { method: 'POST' }),
};

export const useSendOtp = () => useMutation({ mutationFn: authApi.sendOtp });
export const useResetPassword = () => useMutation({ mutationFn: authApi.resetPassword });

/** Sign-in and sign-out change the session, so drop cached data and re-render server parts. */
function useSessionChange() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return (path: string) => {
    queryClient.clear();
    router.replace(path);
    router.refresh();
  };
}

export function useRegister(onSuccessPath: string) {
  const changeSession = useSessionChange();
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: () => changeSession(onSuccessPath),
  });
}

export function useLogin(onSuccessPath: string) {
  const changeSession = useSessionChange();
  return useMutation({ mutationFn: authApi.login, onSuccess: () => changeSession(onSuccessPath) });
}

export function useLogout() {
  const changeSession = useSessionChange();
  // Signed out locally even if the API call fails: the cookies may already be gone.
  return useMutation({ mutationFn: authApi.logout, onSettled: () => changeSession('/login') });
}
