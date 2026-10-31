import { create } from 'zustand';
import type { OtpPurposeValue } from '../services/authService';

/** Sign-up details waiting for the OTP. Kept in memory only, never in route params or storage. */
export interface PendingOtp {
  purpose: OtpPurposeValue;
  phone: string;
  name?: string;
  password?: string;
  referralCode?: string;
}

/** A reset code the OTP screen accepted, handed back to the new-password step. */
export interface VerifiedReset {
  phone: string;
  otp: string;
}

interface AuthFlowState {
  pendingOtp: PendingOtp | null;
  verifiedReset: VerifiedReset | null;
  setPendingOtp: (pending: PendingOtp) => void;
  setVerifiedReset: (verified: VerifiedReset | null) => void;
  clear: () => void;
}

export const useAuthFlowStore = create<AuthFlowState>()((set) => ({
  pendingOtp: null,
  verifiedReset: null,
  setPendingOtp: (pendingOtp) => set({ pendingOtp }),
  setVerifiedReset: (verifiedReset) => set({ verifiedReset }),
  clear: () => set({ pendingOtp: null, verifiedReset: null }),
}));
