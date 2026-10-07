'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { CURRENT_USER } from '@/lib/mock-data';
import {
  Building2,
  Package,
  Wrench,
  FileQuestion,
  BarChart3,
  TrendingUp,
  Users,
  Eye,
  Plus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock
} from 'lucide-react';

import { Suspense } from 'react';

function BusinessNavHeaderInner() {
  const pathname = usePathname();

  const links = [
    { label: 'Overview', href: '/business/manage', icon: Building2 },
    { label: 'Catalog Products', href: '/business/products', icon: Package },
    { label: 'Services', href: '/business/services', icon: Wrench },
    { label: 'Received Enquiries', href: '/business/enquiries', icon: FileQuestion },
    { label: 'Trade Analytics', href: '/business/analytics', icon: BarChart3 }
  ];

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-4">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#2E3192] text-white flex items-center justify-center font-bold text-lg shadow-xs">
            SE
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-[#111111]">Shree Electronics & Systems</h1>
              <span className="text-[11px] font-bold text-[#00AEEF] bg-[#00AEEF]/10 px-2 py-0.5 rounded-full">
                ✓ Verified Gold
              </span>
            </div>
            <p className="text-xs text-[#667085]">Naroda GIDC, Ahmedabad · Manufacturer Suite</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/create"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#2E3192] hover:bg-[#242775] rounded-xl transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item</span>
          </Link>
          <Link
            href="/business/b-1"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#111111] bg-[#F7F8FC] hover:bg-gray-100 border border-[#E5E7EB] rounded-xl transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-[#667085]" />
            <span>Public Profile</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-3 border-t border-[#E5E7EB]">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#2E3192] text-white shadow-xs'
                  : 'text-[#667085] hover:text-[#111111] hover:bg-[#F7F8FC]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function BusinessNavHeader() {
  return (
    <Suspense fallback={<div className="h-28 bg-white border border-[#E5E7EB] rounded-2xl animate-pulse" />}>
      <BusinessNavHeaderInner />
    </Suspense>
  );
}

export default function BusinessManagePage() {
  const { products, services } = useApp();
  const myProducts = products.filter((p) => p.businessId === 'b-1');

  return (
    <div className="space-y-6">
      <BusinessNavHeader />

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-xs font-bold uppercase tracking-wider">Catalogue Views</span>
            <Eye className="w-4 h-4 text-[#2E3192]" />
          </div>
          <p className="text-2xl font-black text-[#111111]">14,820</p>
          <span className="text-[11px] text-emerald-600 font-semibold">↑ 18.4% this month</span>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-xs font-bold uppercase tracking-wider">Active RFQ Leads</span>
            <FileQuestion className="w-4 h-4 text-[#00AEEF]" />
          </div>
          <p className="text-2xl font-black text-[#00AEEF]">28</p>
          <span className="text-[11px] text-[#667085]">6 awaiting quotation</span>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-xs font-bold uppercase tracking-wider">Network Followers</span>
            <Users className="w-4 h-4 text-[#2E3192]" />
          </div>
          <p className="text-2xl font-black text-[#111111]">4,280</p>
          <span className="text-[11px] text-emerald-600 font-semibold">+140 new this week</span>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-xs font-bold uppercase tracking-wider">Response Rate</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600">96.8%</p>
          <span className="text-[11px] text-[#667085]">Avg response &lt; 1 hour</span>
        </div>
      </div>

      {/* Main Management Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Enquiries */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <h2 className="text-sm font-bold text-[#111111]">Recent Buyer Inquiries</h2>
              <Link href="/business/enquiries" className="text-xs font-bold text-[#00AEEF] hover:underline">
                View All Inquiries
              </Link>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F7F8FC] border border-[#E5E7EB] flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[#111111]">Grand Palace Banquet Hotel (Surat)</h3>
                  <p className="text-[#667085] mt-0.5">Inquiring for: Smart LED TV 55-inch UHD (25 Units)</p>
                  <span className="text-[10px] text-[#667085]">Received 2h ago · Contact: +91 98251 09421</span>
                </div>
                <Link
                  href="/messages"
                  className="px-3 py-1.5 text-xs font-bold text-white bg-[#2E3192] rounded-lg shadow-2xs"
                >
                  Reply
                </Link>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F7F8FC] border border-[#E5E7EB] flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[#111111]">TechVista Coworking Space (Ahmedabad)</h3>
                  <p className="text-[#667085] mt-0.5">Inquiring for: Commercial Display Panels (10 Units)</p>
                  <span className="text-[10px] text-[#667085]">Received yesterday · Status: Quote Sent</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded">
                  Quoted
                </span>
              </div>
            </div>
          </div>

          {/* Catalog Highlights */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <h2 className="text-sm font-bold text-[#111111]">Active Listed SKUs ({myProducts.length})</h2>
              <Link href="/business/products" className="text-xs font-bold text-[#00AEEF] hover:underline">
                Manage Products
              </Link>
            </div>

            <div className="space-y-3">
              {myProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 border border-[#E5E7EB] rounded-xl text-xs">
                  <div>
                    <h4 className="font-bold text-[#111111] line-clamp-1">{p.title}</h4>
                    <p className="text-[#667085] mt-0.5">₹{p.price.toLocaleString('en-IN')} · MOQ: {p.minOrderQuantity} {p.unit}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                    {p.availability}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Verification & Operations Status */}
        <div className="space-y-6">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="text-sm font-bold">Verification Credential</h3>
            </div>
            <p className="text-xs text-[#667085] leading-relaxed">
              Your business PAN, GSTIN (24AAACS1420K1Z9) and factory address in Naroda GIDC are certified.
            </p>
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs text-emerald-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>GST E-Way Ready</span>
              </div>
              <p className="text-[11px]">Eligible for zero-commission regional B2B logistics.</p>
            </div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-[#111111]">Quick Supplier Actions</h3>
            <div className="space-y-2 text-xs">
              <Link
                href="/create"
                className="block p-2.5 rounded-xl border border-[#E5E7EB] hover:bg-[#F7F8FC] font-semibold text-[#111111]"
              >
                + Add New Bulk Product Listing
              </Link>
              <Link
                href="/business/analytics"
                className="block p-2.5 rounded-xl border border-[#E5E7EB] hover:bg-[#F7F8FC] font-semibold text-[#111111]"
              >
                📊 View Buyer Traffic & Geo Map
              </Link>
              <Link
                href="/subscription"
                className="block p-2.5 rounded-xl border border-[#E5E7EB] hover:bg-[#F7F8FC] font-semibold text-[#A3238E]"
              >
                👑 Supporters Premium Renewal
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
