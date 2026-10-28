'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  ArrowLeft,
  Settings,
  Bell,
  Eye,
  Trash2,
  AlertTriangle,
  Building2,
  MapPin,
  Globe,
  Clock,
  Shield,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';

export default function BusinessSettingsPage() {
  const router = useRouter();
  const { userBusiness, updateBusinessProfile, openConfirmationModal, showToast } = useApp();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [buyerEnquiriesAlert, setBuyerEnquiriesAlert] = useState(true);
  const [storefrontActive, setStorefrontActive] = useState(true);
  const [showPhone, setShowPhone] = useState(userBusiness?.showPhone ?? true);

  const handleDeactivateBusiness = () => {
    openConfirmationModal({
      title: 'Deactivate Business Profile',
      message:
        'Deactivating your profile will temporarily hide your storefront and product listings from public searches. You can reactivate at any time.',
      confirmLabel: 'Deactivate Profile',
      isDestructive: true,
      onConfirm: () => {
        setStorefrontActive(false);
        showToast('Business storefront deactivated.', 'info');
      },
    });
  };

  const handleDeleteBusiness = () => {
    openConfirmationModal({
      title: 'Delete Business Profile Permanently',
      message:
        'Are you sure you want to delete your business page? All associated product catalogs, updates, and enquiry history will be removed. This cannot be undone.',
      confirmLabel: 'Confirm Permanent Deletion',
      isDestructive: true,
      onConfirm: () => {
        showToast('Business profile deletion scheduled (Mock demo).', 'info');
        router.push('/');
      },
    });
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex items-center gap-3">
        <Link
          href="/business/manage"
          className="p-2 text-[#667085] hover:text-[#111111] hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-[#111111]">Business Page Settings</h1>
          <p className="text-xs text-[#667085]">
            Configure preferences, notifications, and storefront visibility
          </p>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-xs divide-y divide-gray-100 overflow-hidden">
        <Link
          href="/business/edit"
          className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#2E3192]/10 text-[#2E3192] flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#111111]">Edit Business Information</p>
              <p className="text-[11px] text-[#667085]">
                Company name, description, category, and logo
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#667085]" />
        </Link>

        <Link
          href="/business/edit"
          className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#111111]">Social & Web Links</p>
              <p className="text-[11px] text-[#667085]">
                Instagram profile link, official website URL
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#667085]" />
        </Link>

        <Link
          href="/business/edit"
          className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#111111]">Address & Directions</p>
              <p className="text-[11px] text-[#667085]">
                Factory address, Google Maps link, and PIN code
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#667085]" />
        </Link>

        <Link
          href="/business/edit"
          className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#111111]">Operating Hours & Availability</p>
              <p className="text-[11px] text-[#667085]">
                Working days, business hours, and bulk order status
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#667085]" />
        </Link>
      </div>

      {/* Storefront & Catalog Preferences */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-[#111111] uppercase tracking-wider text-xs pb-2 border-b border-gray-100">
          Storefront & Catalog Preferences
        </h2>

        <div className="flex items-center justify-between py-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-[#111111]">Show Number on Catalog</p>
              <span
                className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                  showPhone ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {showPhone ? 'VISIBLE' : 'HIDDEN'}
              </span>
            </div>
            <p className="text-[11px] text-[#667085]">
              Allow visiting buyers to view and call your direct contact number (
              {userBusiness?.phone}) on your catalog
            </p>
          </div>
          <input
            type="checkbox"
            checked={showPhone}
            onChange={(e) => {
              const val = e.target.checked;
              setShowPhone(val);
              updateBusinessProfile({ showPhone: val });
              showToast(
                val
                  ? 'Phone number will now be shown on your catalog'
                  : 'Phone number is now hidden from your catalog',
                'info',
              );
            }}
            className="w-4 h-4 accent-[#2E3192] cursor-pointer ml-3 shrink-0"
          />
        </div>
      </div>

      {/* Notifications Preferences */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-[#111111] uppercase tracking-wider text-xs pb-2 border-b border-gray-100">
          Enquiry & Lead Notifications
        </h2>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-xs font-bold text-[#111111]">Buyer RFQ Notifications</p>
            <p className="text-[11px] text-[#667085]">
              Get notified immediately when a buyer requests a trade quote
            </p>
          </div>
          <input
            type="checkbox"
            checked={buyerEnquiriesAlert}
            onChange={(e) => setBuyerEnquiriesAlert(e.target.checked)}
            className="w-4 h-4 accent-[#2E3192]"
          />
        </div>

        <div className="flex items-center justify-between py-2 border-t border-gray-100">
          <div>
            <p className="text-xs font-bold text-[#111111]">Referral & Reward Alerts</p>
            <p className="text-[11px] text-[#667085]">
              Notifications when referral commissions are credited to your wallet
            </p>
          </div>
          <input
            type="checkbox"
            checked={notificationsEnabled}
            onChange={(e) => setNotificationsEnabled(e.target.checked)}
            className="w-4 h-4 accent-[#2E3192]"
          />
        </div>
      </div>

      {/* Danger Zone: Deactivate & Delete Profile */}
      <div className="bg-white border border-rose-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-rose-700">
          <AlertTriangle className="w-4 h-4" />
          <h2 className="text-xs font-bold uppercase tracking-wider">Danger Zone</h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 border-b border-gray-100">
          <div>
            <p className="text-xs font-bold text-[#111111]">Deactivate Storefront</p>
            <p className="text-[11px] text-[#667085]">
              Temporarily unpublish your business page and products
            </p>
          </div>
          <button
            onClick={handleDeactivateBusiness}
            className="px-3.5 py-1.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors self-start sm:self-auto"
          >
            {storefrontActive ? 'Deactivate Storefront' : 'Reactivate Storefront'}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2">
          <div>
            <p className="text-xs font-bold text-rose-700">Delete Business Page</p>
            <p className="text-[11px] text-[#667085]">
              Permanently remove this business, products, and catalogue from Supporters
            </p>
          </div>
          <button
            onClick={handleDeleteBusiness}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-2xs self-start sm:self-auto"
          >
            Delete Profile
          </button>
        </div>
      </div>
    </div>
  );
}
