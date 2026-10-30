'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { UserPlus, Mail, Lock, Gift, User, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { showToast } = useApp();

  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('SUPPORT123');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showToast('Account credentials created! Please verify OTP.', 'success');
      router.push('/verify');
    }, 600);
  };

  return (
    <div className="w-full min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-3">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl w-full p-8 shadow-sm space-y-6">
          {/* Brand Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#2E3192] text-white flex items-center justify-center mx-auto shadow-xs">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path
                  d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm-1 16l-4-4 1.41-1.41L11 15.17l6.59-6.59L19 10l-8 8z"
                  fill="#00AEEF"
                />
                <circle cx="12" cy="12" r="3" fill="#FFFFFF" />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-[#111111]">Join Supporters</h1>
            <p className="text-xs text-[#667085]">
              Create your account to discover suppliers and expand your commerce network
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1">
                Full Name / Business Proprietor
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#667085] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#2E3192]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1">
                Email Address or Mobile Number
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#667085] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="ramesh@patelfurniture.com or +91"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#2E3192]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#667085] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#2E3192]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">Confirm</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#667085] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#2E3192]"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1">
                Referral Code (Optional)
              </label>
              <div className="relative">
                <Gift className="w-4 h-4 text-[#A3238E] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="SUPPORT123"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#A3238E] font-mono"
                />
              </div>
              {referralCode === 'SUPPORT123' && (
                <span className="text-[11px] text-[#A3238E] mt-1 block">
                  ✓ Special partner code applied (Welcome bonus enabled)
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold text-white bg-[#2E3192] hover:bg-[#242775] rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {loading ? <span>Processing...</span> : <span>Create Supporters Account</span>}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-2 text-center text-xs text-[#667085]">
            <span>Already have an account? </span>
            <Link href="/login" className="font-bold text-[#2E3192] hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
