'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { LogIn, Phone, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useApp();

  const [identifier, setIdentifier] = useState('aarav.mehta@enterpriseventures.in');
  const [password, setPassword] = useState('Supporters@2026');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showToast('Welcome back to Supporters!', 'success');
      router.push('/');
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
              <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm-1 16l-4-4 1.41-1.41L11 15.17l6.59-6.59L19 10l-8 8z" fill="#00AEEF"/>
              <circle cx="12" cy="12" r="3" fill="#FFFFFF"/>
            </svg>
          </div>
          <h1 className="text-2xl font-black text-[#111111]">Sign In to Supporters</h1>
          <p className="text-xs text-[#667085]">
            Access your B2B network, buyer enquiries, and business catalogue
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#111111] mb-1">
              Email or Mobile Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#667085] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="+91 Mobile or Email"
                className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#2E3192]"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-[#111111]">Password</label>
              <Link href="/forgot-password" className="text-[11px] font-semibold text-[#00AEEF] hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#667085] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#2E3192]"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold text-white bg-[#2E3192] hover:bg-[#242775] rounded-xl shadow-xs transition-colors disabled:opacity-50"
          >
            {loading ? <span>Signing in...</span> : <span>Sign In to Supporters</span>}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Google / Quick sign-in */}
        <div className="pt-2">
          <div className="relative flex items-center justify-center mb-4">
            <div className="border-t border-[#E5E7EB] w-full" />
            <span className="bg-white px-3 text-[11px] text-[#667085] uppercase font-semibold absolute">
              or continue with
            </span>
          </div>

          <button
            onClick={() => {
              showToast('Google Workspace authentication simulated.', 'info');
              router.push('/');
            }}
            type="button"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-[#111111] bg-[#F7F8FC] hover:bg-gray-100 border border-[#E5E7EB] rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>

        {/* Footer */}
        <div className="pt-2 text-center text-xs text-[#667085]">
          <span>Don&apos;t have an account yet? </span>
          <Link href="/register" className="font-bold text-[#2E3192] hover:underline">
            Register your Business
          </Link>
        </div>
        </div>
      </div>
    </div>
  );
}
