'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Lock, Mail, ArrowRight, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { showToast } = useApp();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    showToast('Password reset link dispatched to your inbox!', 'success');
  };

  return (
    <div className="w-full min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-3">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl w-full p-8 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2E3192] flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-black text-[#111111]">Reset Password</h1>
            <p className="text-xs text-[#667085]">
              Enter your registered email address or mobile to receive recovery instructions.
            </p>
          </div>

          {submitted ? (
            <div className="p-4 rounded-xl bg-blue-50 text-xs text-[#2E3192] space-y-3">
              <p>
                We have sent a secure password reset link to <strong>{email}</strong>. Please check
                your inbox and spam folders.
              </p>
              <button
                onClick={() => router.push('/reset-password')}
                className="w-full py-2.5 bg-[#2E3192] text-white font-bold rounded-lg"
              >
                Simulate Reset Link Click →
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">
                  Registered Email / Mobile
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#667085] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@business.com"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#2E3192]"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold text-white bg-[#2E3192] hover:bg-[#242775] rounded-xl shadow-xs transition-colors"
              >
                <span>Send Recovery Link</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          <div className="pt-2 text-center text-xs">
            <Link
              href="/login"
              className="flex items-center justify-center gap-1.5 text-[#667085] hover:text-[#111111]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
