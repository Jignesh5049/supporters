'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Filter,
  PlusCircle,
  ShieldCheck,
  Building,
  HelpCircle,
} from 'lucide-react';

export default function WalletPage() {
  const { walletData } = useApp();
  const [filterType, setFilterType] = useState<'All' | 'Completed' | 'Pending'>('All');

  const filteredTransactions = walletData.transactions.filter((tx) => {
    if (filterType === 'All') return true;
    return tx.status === filterType;
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Wallet Dashboard Header Card */}
      <div className="bg-gradient-to-br from-[#2E3192] to-[#1E2060] text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 rounded-full pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-[#00AEEF]/10 rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white/80 text-xs font-semibold uppercase tracking-wider">
              <Wallet className="w-4 h-4 text-[#00AEEF]" />
              <span>Supporters App Wallet</span>
            </div>
            <p className="text-xs text-white/70">Available Balance to Withdraw</p>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white font-mono">
              ₹{walletData.availableBalance.toLocaleString('en-IN')}
            </h1>
            <p className="text-xs text-white/60">
              Zero pending reserve deducted · Ready for direct payout
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link
              href="/wallet/withdraw"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white text-[#2E3192] font-black text-sm shadow-md hover:bg-gray-50 transition-all hover:scale-102"
            >
              <ArrowUpRight className="w-4 h-4 text-[#2E3192]" />
              <span>Withdraw Money</span>
            </Link>

            <Link
              href="/referral"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm border border-white/20 transition-all"
            >
              <span>+ Earn More</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Available Balance */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#667085]">
            Available Balance
          </span>
          <p className="text-2xl font-black text-emerald-600 font-mono">
            ₹{walletData.availableBalance.toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-[#667085]">Available now</span>
        </div>

        {/* Total Referral Earnings */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#667085]">
            Total Referral
          </span>
          <p className="text-2xl font-black text-[#A3238E] font-mono">
            ₹{walletData.totalReferralEarnings.toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-[#667085]">Max capped at ₹500</span>
        </div>

        {/* Pending Withdrawals */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#667085]">
            Pending Payouts
          </span>
          <p className="text-2xl font-black text-amber-600 font-mono">
            ₹{walletData.pendingWithdrawals.toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-[#667085]">In bank processing</span>
        </div>

        {/* Total Withdrawn */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#667085]">
            Total Withdrawn
          </span>
          <p className="text-2xl font-black text-[#111111] font-mono">
            ₹{walletData.totalWithdrawn.toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-[#667085]">Lifetime payouts</span>
        </div>
      </div>

      {/* Active Withdrawal Requests Section */}
      {walletData.withdrawalRequests && walletData.withdrawalRequests.length > 0 && (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
            <div>
              <h2 className="text-base font-bold text-[#111111]">Withdrawal Requests</h2>
              <p className="text-xs text-[#667085]">Requests submitted for bank/UPI disbursement</p>
            </div>
            <Link
              href="/wallet/withdraw"
              className="text-xs font-bold text-[#2E3192] hover:underline"
            >
              + New Request
            </Link>
          </div>

          <div className="space-y-3">
            {walletData.withdrawalRequests.map((req) => (
              <div
                key={req.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#F8FAFC] border border-gray-200 rounded-xl gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#111111]">
                      ₹{req.amount.toLocaleString('en-IN')} via {req.method}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        req.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : req.status === 'Processing'
                            ? 'bg-sky-100 text-sky-800'
                            : req.status === 'Pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#667085]">
                    Ref: <span className="font-mono">{req.referenceId}</span> · {req.createdAt}
                  </p>
                  {req.upiId && <p className="text-xs text-[#667085]">UPI: {req.upiId}</p>}
                  {req.accountNumber && (
                    <p className="text-xs text-[#667085]">
                      Bank: {req.bankName} (A/C: ••••{req.accountNumber.slice(-4)})
                    </p>
                  )}
                </div>

                <div className="text-xs sm:text-right text-[#667085]">
                  <p className="font-semibold text-emerald-600">
                    {req.estimatedDate || 'Est. 24-48 hrs'}
                  </p>
                  <p className="text-[11px]">Backend verification</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction History Section */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E7EB]">
          <div>
            <h2 className="text-base font-bold text-[#111111]">Transaction History</h2>
            <p className="text-xs text-[#667085]">
              Real-time audit log of referral rewards and withdrawals
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-gray-100 p-1 rounded-xl text-xs font-bold">
            {(['All', 'Completed', 'Pending'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterType(tab)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterType === tab
                    ? 'bg-white text-[#2E3192] shadow-xs'
                    : 'text-[#667085] hover:text-[#111111]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-[#667085] space-y-2">
            <FileText className="w-8 h-8 mx-auto text-gray-300" />
            <p className="text-sm font-semibold">No transactions match your filter</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredTransactions.map((tx) => {
              const isCredit =
                tx.type === 'referral_reward' || tx.type === 'bonus' || tx.type === 'refund';
              return (
                <div key={tx.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        isCredit ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-[#2E3192]'
                      }`}
                    >
                      {isCredit ? (
                        <ArrowDownLeft className="w-5 h-5" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-[#111111]">
                          {tx.title.replace(
                            /^(1st|2nd|3rd|\d+(?:st|nd|rd|th))\s+Referral\s+Reward\s+—\s*/i,
                            '',
                          )}
                        </p>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                            tx.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700'
                              : tx.status === 'Pending'
                                ? 'bg-amber-50 text-amber-700'
                                : tx.status === 'Failed'
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-purple-50 text-purple-700'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#667085]">
                        Ref: <span className="font-mono">{tx.referenceId}</span> · {tx.createdAt}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p
                      className={`text-base font-black font-mono ${
                        isCredit ? 'text-emerald-600' : 'text-[#111111]'
                      }`}
                    >
                      {isCredit ? '+' : '−'}₹{tx.amount.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[11px] text-[#667085]">
                      {isCredit ? 'Wallet Credit' : 'Withdrawal'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
