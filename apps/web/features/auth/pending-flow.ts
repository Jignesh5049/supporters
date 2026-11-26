'use client';

/**
 * Carries details from one auth step to the next (register → verify,
 * forgot-password → reset-password) in memory only. Nothing goes to storage
 * or the URL, so a reload starts the flow again.
 */
export interface PendingSignup {
  name: string;
  phone: string;
  password: string;
  /** A friend's referral code, entered (or prefilled from an invite link) at signup only. */
  referralCode?: string;
}

let pendingSignup: PendingSignup | null = null;
let pendingResetPhone: string | null = null;

export const pendingFlow = {
  setSignup: (value: PendingSignup | null) => {
    pendingSignup = value;
  },
  getSignup: () => pendingSignup,
  setResetPhone: (value: string | null) => {
    pendingResetPhone = value;
  },
  getResetPhone: () => pendingResetPhone,
};

/** `+919876543210` → `+91 98765 43210`. */
export const formatPhone = (phone: string) => phone.replace(/^\+91(\d{5})(\d{5})$/, '+91 $1 $2');

/** Turns a typed 10-digit number (with or without +91, spaces or dashes) into E.164. */
export function toE164(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return value.trim();
}
