'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Crown,
  Check,
  ShieldCheck,
  TrendingUp,
  Search,
  Sparkles,
  CreditCard,
  Download,
  Calendar,
} from 'lucide-react';

export default function SubscriptionPage() {
  const { showToast } = useApp();
  const [subscribed, setSubscribed] = useState(true);

  const benefits = [
    {
      title: 'Verified Gold Supplier Badge',
      desc: 'Instant trust accreditation visible across all your products, services & feed posts.',
    },
    {
      title: 'Priority Search & Discovery Boost',
      desc: 'Appear at the top of category feeds and city buyer searches.',
    },
    {
      title: 'Direct WhatsApp & Lead Routing',
      desc: 'Instant real-time inquiry forwarding to your company sales WhatsApp numbers.',
    },
    {
      title: 'Unlimited Catalog & Product Uploads',
      desc: 'List your complete manufacturing catalogue without SKU limits.',
    },
    {
      title: 'Advanced Business Analytics',
      desc: 'Monitor profile impressions, product clicks, and lead geographic heatmaps.',
    },
    {
      title: 'Zero Commission Trade Connect',
      desc: 'Never pay intermediary fees on closed purchase orders.',
    },
  ];

  const paymentHistory = [
    {
      id: 'inv-2026-01',
      plan: 'Supporters Premium Annual',
      date: 'March 15, 2026',
      amount: 999,
      status: 'Paid',
      method: 'UPI / HDFC Bank',
    },
    {
      id: 'inv-2025-01',
      plan: 'Supporters Premium Annual',
      date: 'March 15, 2025',
      amount: 999,
      status: 'Paid',
      method: 'Razorpay / Net Banking',
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Banner */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
              <Crown className="w-3.5 h-3.5" />
              <span>Supporters Premium Plan</span>
            </div>
            <h1 className="text-2xl font-black text-[#111111]">
              Elevate Your Trade Visibility Across India
            </h1>
            <p className="text-xs sm:text-sm text-[#667085] max-w-xl leading-relaxed">
              Unlock verified enterprise credentials, search prominence, and business analytics to
              turn social discovery into consistent bulk orders.
            </p>
          </div>

          {/* Pricing Box */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#2E3192] to-[#242775] text-white shrink-0 md:w-72 text-center space-y-3 shadow-md">
            <span className="text-xs uppercase font-semibold text-cyan-200 tracking-wider">
              Annual Membership
            </span>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-3xl font-black">₹999</span>
              <span className="text-xs text-white/80">/ year</span>
            </div>
            <p className="text-[11px] text-white/70">
              Includes all GST invoices and priority customer support.
            </p>
            <button
              onClick={() =>
                showToast('Subscription active. Next billing cycle in March 2027.', 'info')
              }
              className="w-full py-2.5 px-4 text-xs font-bold bg-[#00AEEF] hover:bg-[#0098d4] text-white rounded-xl shadow-xs transition-colors"
            >
              Subscribe for ₹999/year
            </button>
          </div>
        </div>
      </div>

      {/* Current Plan Status */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs">
        <h2 className="text-base font-bold text-[#111111] pb-3 border-b border-[#E5E7EB]">
          Current Plan Status
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
          <div className="p-4 rounded-xl bg-[#F7F8FC] border border-[#E5E7EB]">
            <span className="text-[#667085] block mb-1">Active Membership</span>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-[#2E3192]">Supporters Premium</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                Active
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F8FC] border border-[#E5E7EB]">
            <span className="text-[#667085] block mb-1">Renewal Date</span>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#667085]" />
              <span className="font-bold text-sm text-[#111111]">March 15, 2027</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F8FC] border border-[#E5E7EB]">
            <span className="text-[#667085] block mb-1">Billing Interval</span>
            <span className="font-bold text-sm text-[#111111]">₹999 Annual (Auto-Renew)</span>
          </div>
        </div>
      </div>

      {/* Benefits Grid */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-4">
        <h2 className="text-base font-bold text-[#111111]">Premium Membership Privileges</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {benefits.map((b, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3.5 rounded-xl bg-[#F7F8FC] border border-[#E5E7EB]"
            >
              <div className="w-6 h-6 rounded-full bg-[#2E3192]/10 text-[#2E3192] flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#111111]">{b.title}</h3>
                <p className="text-xs text-[#667085] mt-0.5 leading-relaxed">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-4">
        <h2 className="text-base font-bold text-[#111111] pb-3 border-b border-[#E5E7EB]">
          Payment & Invoicing History
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E5E7EB] text-[#667085] uppercase tracking-wider font-semibold">
                <th className="pb-3">Invoice ID</th>
                <th className="pb-3">Plan</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Payment Method</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]/70">
              {paymentHistory.map((inv) => (
                <tr key={inv.id}>
                  <td className="py-3 font-mono font-bold text-[#111111]">{inv.id}</td>
                  <td className="py-3 text-[#111111]">{inv.plan}</td>
                  <td className="py-3 text-[#667085]">{inv.date}</td>
                  <td className="py-3 text-[#667085]">{inv.method}</td>
                  <td className="py-3 font-bold text-[#111111]">₹{inv.amount}</td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => showToast('Tax Invoice PDF downloaded.', 'info')}
                      className="inline-flex items-center gap-1 text-xs text-[#2E3192] font-semibold hover:underline"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
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
