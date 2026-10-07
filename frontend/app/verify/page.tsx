'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { ShieldCheck, ArrowRight, RotateCcw, Edit2 } from 'lucide-react';

export default function VerifyOtpPage() {
  const router = useRouter();
  const { showToast } = useApp();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);

  const handleOtpChange = (val: string, index: number) => {
    if (val.length > 1) val = val[val.length - 1];
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);

    // Auto-focus next input
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showToast('Contact verified! Welcome to Supporters onboarding.', 'success');
      router.push('/onboarding');
    }, 600);
  };

  return (
    <div className="w-full min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-3">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl w-full p-8 shadow-sm space-y-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2E3192] flex items-center justify-center mx-auto">
          <ShieldCheck className="w-6 h-6" />
        </div>

        <div>
          <h1 className="text-xl font-black text-[#111111]">Verify Your Contact</h1>
          <p className="text-xs text-[#667085] mt-1">
            We sent a 6-digit confirmation code to <strong>+91 98795 23410</strong>
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex justify-center gap-2">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                id={`otp-${idx}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(e.target.value, idx)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                className="w-11 h-12 text-center text-lg font-bold border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#2E3192] focus:ring-2 focus:ring-[#2E3192]/20"
                required
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold text-white bg-[#2E3192] hover:bg-[#242775] rounded-xl shadow-xs transition-colors disabled:opacity-50"
          >
            {loading ? <span>Verifying OTP...</span> : <span>Confirm & Proceed</span>}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 flex items-center justify-between text-xs text-[#667085] border-t border-[#E5E7EB]">
          <button
            onClick={() => showToast('New OTP sent to your phone.', 'info')}
            className="flex items-center gap-1 font-semibold text-[#00AEEF] hover:underline"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Resend Code</span>
          </button>

          <Link
            href="/register"
            className="flex items-center gap-1 font-semibold hover:text-[#111111]"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Change Number</span>
          </Link>
        </div>
      </div>
      </div>
    </div>
  );
}
