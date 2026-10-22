'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { REFERRAL_REWARD_CONFIG, getReferralMilestoneStatus } from '@/lib/referral';
import {
  Gift,
  Copy,
  Check,
  Share2,
  Users,
  CheckCircle2,
  Clock,
  Coins,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Wallet,
  XCircle
} from 'lucide-react';

export default function ReferralPage() {
  const { referralData, showToast } = useApp();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const referralCode = referralData.code || 'SUPP500X';
  const shareLink = `https://supporters.in/register?ref=${referralCode}`;

  const milestoneInfo = getReferralMilestoneStatus(referralData.successful);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    showToast(`Referral code ${referralCode} copied to clipboard!`, 'success');
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopiedLink(true);
    showToast('Direct invite link copied to clipboard!', 'success');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Supporters Trade Network',
          text: `Use my invite code ${referralCode} to sign up on Supporters and connect with verified businesses!`,
          url: shareLink,
        });
      } catch (err) {
        // Share cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Hero Banner with Curated Gradient */}
      <div className="bg-gradient-to-br from-[#A3238E]/10 via-white to-[#2E3192]/5 border border-[#A3238E]/25 rounded-2xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#A3238E]/10 border border-[#A3238E]/20 text-[#A3238E] text-xs font-bold uppercase tracking-wider">
              <Gift className="w-3.5 h-3.5" />
              <span>Refer & Earn Program</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
              Invite Businesses & Earn up to ₹500
            </h1>

            <p className="text-xs sm:text-sm text-[#667085] leading-relaxed">
              Introduce verified manufacturers, wholesalers, and traders to Supporters. Earn rewards directly into your app wallet for your first two successful business referrals.
            </p>

            <div className="flex items-center gap-3 pt-1">
              <Link
                href="/wallet"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>View App Wallet</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Referral Code Card */}
          <div className="bg-white p-5 rounded-2xl border border-[#A3238E]/30 shadow-sm shrink-0 w-full md:w-80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">
                Your Referral Code
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>

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

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-[#2E3192] bg-[#2E3192]/10 hover:bg-[#2E3192]/15 rounded-xl transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
              </button>
              <button
                onClick={handleShare}
                className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-white bg-[#A3238E] hover:bg-[#8e1c7b] rounded-xl shadow-xs transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Link</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reward Progress Tracker Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-[#111111]">Referral Reward Progress</h2>
            <p className="text-xs text-[#667085]">
              {milestoneInfo.isCapped
                ? 'Maximum reward limit achieved! Thank you for supporting the network.'
                : `Complete ${2 - referralData.successful} more referral to reach the maximum ₹500 reward.`}
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 bg-[#A3238E]/10 border border-[#A3238E]/20 px-3 py-1 rounded-full text-xs font-bold text-[#A3238E] self-start sm:self-auto">
            <Coins className="w-3.5 h-3.5" />
            <span>Earned: ₹{referralData.rewardsEarned} / ₹{referralData.maxRewardLimit}</span>
          </div>
        </div>

        {/* Milestone Bar */}
        <div className="space-y-2">
          <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#A3238E] to-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${milestoneInfo.progressPercent}%` }}
            />
          </div>

          <div className="flex justify-between text-[11px] font-bold text-[#667085] pt-1">
            <span className={referralData.successful >= 0 ? 'text-[#111111]' : ''}>Start (₹0)</span>
            <span className={referralData.successful >= 1 ? 'text-emerald-600 font-black' : ''}>
              1st Referral: ₹300 {referralData.successful >= 1 && '✓'}
            </span>
            <span className={referralData.successful >= 2 ? 'text-emerald-600 font-black' : ''}>
              2nd Referral: ₹200 (Total ₹500) {referralData.successful >= 2 && '✓'}
            </span>
          </div>
        </div>

        {/* 2 Breakdown Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Milestone 1 Card */}
          <div
            className={`border rounded-xl p-4 transition-all ${
              referralData.successful >= 1
                ? 'bg-emerald-50/70 border-emerald-300'
                : 'bg-[#F8FAFC] border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#667085]">
                Milestone 1 · First Referral
              </span>
              {referralData.successful >= 1 ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-gray-500 bg-gray-200/60 px-2 py-0.5 rounded-full">
                  Next Up
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black text-[#111111]">₹300</p>
              <span className="text-xs text-[#667085]">wallet credit</span>
            </div>
            <p className="text-xs text-[#667085] mt-1">
              Earn ₹300 instantly when your first invited business registers and is verified.
            </p>
          </div>

          {/* Milestone 2 Card */}
          <div
            className={`border rounded-xl p-4 transition-all ${
              referralData.successful >= 2
                ? 'bg-emerald-50/70 border-emerald-300'
                : referralData.successful === 1
                ? 'bg-amber-50/60 border-amber-300'
                : 'bg-[#F8FAFC] border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#667085]">
                Milestone 2 · Second Referral
              </span>
              {referralData.successful >= 2 ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                </span>
              ) : referralData.successful === 1 ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  <Clock className="w-3.5 h-3.5" /> Up Next
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-gray-500 bg-gray-200/60 px-2 py-0.5 rounded-full">
                  Locked
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black text-[#111111]">₹200</p>
              <span className="text-xs text-[#667085]">wallet credit</span>
            </div>
            <p className="text-xs text-[#667085] mt-1">
              Earn ₹200 when your second business referral completes onboarding.
            </p>
          </div>
        </div>

        {/* Informative Rule Box */}
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-3.5 flex items-start gap-3">
          <HelpCircle className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <div className="text-xs text-sky-800 space-y-1">
            <p className="font-bold">Important Policy & Reward Limit</p>
            <p className="text-sky-700 leading-relaxed">
              Every member can earn a maximum of <strong>₹500 in total rewards</strong> (₹300 for the 1st referral + ₹200 for the 2nd referral).
              Referrals from the 3rd invitation onward do not receive cash rewards, but help grow your business network.
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-xs font-bold uppercase tracking-wider">Total Invites</span>
            <Users className="w-4 h-4 text-[#2E3192]" />
          </div>
          <p className="text-2xl font-black text-[#111111]">
            {referralData.totalReferrals}
          </p>
          <span className="text-[11px] text-[#667085]">Businesses invited</span>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-xs font-bold uppercase tracking-wider">Successful</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600">
            {referralData.successful}
          </p>
          <span className="text-[11px] text-[#667085]">Verified & eligible</span>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-xs font-bold uppercase tracking-wider">Pending</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600">
            {referralData.pending}
          </p>
          <span className="text-[11px] text-[#667085]">Under verification</span>
        </div>

        <div className="bg-white border border-[#A3238E]/25 rounded-2xl p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#A3238E]">
            <span className="text-xs font-bold uppercase tracking-wider">Rewards Earned</span>
            <Coins className="w-4 h-4 text-[#A3238E]" />
          </div>
          <p className="text-2xl font-black text-[#A3238E]">
            ₹{referralData.rewardsEarned.toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-emerald-600 font-bold">In App Wallet (Max ₹500)</span>
        </div>
      </div>

      {/* Referral History Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E7EB]">
          <div>
            <h2 className="text-base font-bold text-[#111111]">Referral History</h2>
            <p className="text-xs text-[#667085]">Track friends and businesses registered using your code</p>
          </div>
          <Link
            href="/wallet"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#2E3192] hover:bg-[#242775] rounded-xl transition-colors self-start sm:self-auto"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Open Wallet & Withdraw</span>
          </Link>
        </div>

        {referralData.history.length === 0 ? (
          <div className="text-center py-12 text-[#667085] space-y-2">
            <Users className="w-8 h-8 mx-auto text-gray-300" />
            <p className="text-sm font-semibold">No referrals yet</p>
            <p className="text-xs text-gray-400">Share your referral link to earn rewards!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5E7EB] text-[#667085] font-bold uppercase tracking-wider">
                  <th className="pb-3 pl-1">Business / Contact</th>
                  <th className="pb-3">Location</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right pr-1">Reward Credited</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {referralData.history.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 pl-1">
                      <p className="font-bold text-[#111111]">{item.businessName}</p>
                      <p className="text-[11px] text-[#667085]">{item.name}</p>
                    </td>
                    <td className="py-3 text-[#667085]">{item.city}</td>
                    <td className="py-3 text-[#667085]">{item.date}</td>
                    <td className="py-3">
                      {item.status === 'Successful' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Successful
                        </span>
                      )}
                      {item.status === 'Pending' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3" /> Pending Verification
                        </span>
                      )}
                      {(item.status === 'Ineligible' || item.status === 'Failed') && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3 h-3" /> {item.status}
                        </span>
                      )}
                      {item.notes && (
                        <p className="text-[10px] text-gray-400 mt-0.5">{item.notes}</p>
                      )}
                    </td>
                    <td className="py-3 text-right pr-1 font-mono font-bold">
                      {item.rewardAmount > 0 ? (
                        <span className="text-emerald-600">+₹{item.rewardAmount}</span>
                      ) : (
                        <span className="text-gray-400">₹0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
