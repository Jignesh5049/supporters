'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { MOCK_REFERRAL_DATA } from '@/lib/mock-data';
import {
  Gift,
  Copy,
  Check,
  Share2,
  Users,
  CheckCircle2,
  Clock,
  Coins,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';

export default function ReferralPage() {
  const { showToast } = useApp();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const referralCode = MOCK_REFERRAL_DATA.code;
  const shareLink = `https://supporters.in/register?ref=${referralCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    showToast('Referral code SUPPORT123 copied to clipboard!', 'success');
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopiedLink(true);
    showToast('Direct invite link copied!', 'success');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Hero Banner with #A3238E accent */}
      <div className="bg-gradient-to-br from-[#A3238E]/5 via-white to-[#A3238E]/10 border border-[#A3238E]/25 rounded-2xl p-6 sm:p-8 shadow-2xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#A3238E]/10 border border-[#A3238E]/20 text-[#A3238E] text-xs font-bold uppercase tracking-wider">
              <Gift className="w-3.5 h-3.5" />
              <span>Supporters Partner Program</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-[#111111]">
              Invite & Earn with Supporters
            </h1>

            <p className="text-xs sm:text-sm text-[#667085] leading-relaxed">
              Introduce verified manufacturers, wholesalers, and commercial buyers to Supporters. You receive <strong className="text-[#A3238E]">₹250 direct cash credit</strong> for each registered business completing their first trade catalogue.
            </p>
          </div>

          {/* Referral Code Box */}
          <div className="bg-white p-5 rounded-2xl border border-[#A3238E]/30 shadow-sm shrink-0 w-full md:w-80 space-y-3">
            <span className="text-xs font-bold text-[#667085] uppercase tracking-wider block">
              Your Unique Referral Code
            </span>

            <div className="flex items-center justify-between bg-[#F7F8FC] border border-[#E5E7EB] rounded-xl px-4 py-2.5">
              <span className="text-lg font-mono font-black text-[#A3238E] tracking-wider">
                {referralCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 text-xs font-bold text-[#A3238E] hover:underline"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <button
              onClick={handleCopyLink}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold text-white bg-[#A3238E] hover:bg-[#8e1c7b] rounded-xl shadow-2xs transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>{copiedLink ? 'Link Copied!' : 'Share Direct Invite Link'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-xs font-bold uppercase tracking-wider">Total Referrals</span>
            <Users className="w-4 h-4 text-[#2E3192]" />
          </div>
          <p className="text-2xl font-black text-[#111111]">
            {MOCK_REFERRAL_DATA.totalReferrals}
          </p>
          <span className="text-[11px] text-[#667085]">Businesses invited</span>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-xs font-bold uppercase tracking-wider">Successful</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600">
            {MOCK_REFERRAL_DATA.successful}
          </p>
          <span className="text-[11px] text-[#667085]">KYC verified members</span>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-xs font-bold uppercase tracking-wider">Pending</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600">
            {MOCK_REFERRAL_DATA.pending}
          </p>
          <span className="text-[11px] text-[#667085]">Awaiting profile verification</span>
        </div>

        <div className="bg-white border border-[#A3238E]/25 rounded-2xl p-5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[#A3238E]">
            <span className="text-xs font-bold uppercase tracking-wider">Rewards Earned</span>
            <Coins className="w-4 h-4 text-[#A3238E]" />
          </div>
          <p className="text-2xl font-black text-[#A3238E]">
            ₹{MOCK_REFERRAL_DATA.rewardsEarned.toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-[#A3238E] font-semibold">Credited to wallet</span>
        </div>
      </div>

      {/* Referral History Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
          <div>
            <h2 className="text-base font-bold text-[#111111]">Referral History</h2>
            <p className="text-xs text-[#667085]">Track businesses invited via your partner link</p>
          </div>
          <button
            onClick={() => showToast('Wallet payout requested to your linked bank account.', 'success')}
            className="px-3.5 py-1.5 text-xs font-bold text-[#A3238E] bg-[#A3238E]/10 hover:bg-[#A3238E]/20 rounded-xl transition-colors"
          >
            Withdraw Balance
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E5E7EB] text-[#667085] uppercase tracking-wider font-semibold">
                <th className="pb-3">Invited Business</th>
                <th className="pb-3">Hub Location</th>
                <th className="pb-3">Registration Date</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Incentive</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]/70">
              {MOCK_REFERRAL_DATA.history.map((item) => (
                <tr key={item.id} className="hover:bg-[#F7F8FC] transition-colors">
                  <td className="py-3.5 font-bold text-[#111111]">
                    {item.businessName}
                  </td>
                  <td className="py-3.5 text-[#667085]">
                    {item.city}
                  </td>
                  <td className="py-3.5 text-[#667085]">
                    {item.date}
                  </td>
                  <td className="py-3.5">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        item.status === 'Reward Credited'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : item.status === 'Successful'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3.5 text-right font-extrabold text-[#A3238E]">
                    +₹{item.rewardAmount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
