'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useLogout } from '@/features/auth/auth-api';
import { CURRENT_USER } from '@/lib/mock-data';
import {
  User,
  Shield,
  Bell,
  Sliders,
  Eye,
  Building,
  Crown,
  HelpCircle,
  FileText,
  LogOut,
  Trash2,
  ChevronRight,
  Check,
  Smartphone,
  Lock,
  Globe,
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const logout = useLogout();
  const { openConfirmationModal, showToast, userBusiness, updateBusinessProfile } = useApp();

  const [activeSection, setActiveSection] = useState<
    'account' | 'preferences' | 'privacy' | 'business' | 'subscription' | 'support' | 'legal'
  >('account');

  // Form states
  const [name, setName] = useState(CURRENT_USER.name);
  const [email, setEmail] = useState(CURRENT_USER.email);
  const [phone, setPhone] = useState(CURRENT_USER.phone);
  const [bio, setBio] = useState(CURRENT_USER.bio);
  const [profileVisibility, setProfileVisibility] = useState('public');
  const [showPhoneOnCatalog, setShowPhoneOnCatalog] = useState(
    userBusiness?.showPhone ?? CURRENT_USER.showPhone ?? true,
  );
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [whatsappAlerts, setWhatsappAlerts] = useState(true);
  const [language, setLanguage] = useState('English');

  const handleToggleShowPhone = (val: boolean) => {
    setShowPhoneOnCatalog(val);
    updateBusinessProfile({ showPhone: val });
    showToast(
      val
        ? 'Phone number will now be shown on your catalog'
        : 'Phone number is now hidden from your catalog',
      'info',
    );
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Profile information updated successfully!', 'success');
  };

  const handleLogout = () => {
    openConfirmationModal({
      title: 'Sign Out',
      message: 'Are you sure you want to log out from this device?',
      confirmLabel: 'Sign Out',
      isDestructive: true,
      onConfirm: () => logout.mutate(),
    });
  };

  const handleDeleteAccount = () => {
    openConfirmationModal({
      title: 'Delete Account Permanently',
      message:
        'This will irreversibly erase your profile, catalog items, saved bookmarks and message logs. Are you certain?',
      confirmLabel: 'Delete Forever',
      isDestructive: true,
      onConfirm: () => {
        showToast('Account scheduled for deactivation', 'info');
        router.push('/login');
      },
    });
  };

  const sections = [
    { id: 'account', label: 'Account & Security', icon: User },
    { id: 'preferences', label: 'Preferences & Alerts', icon: Bell },
    { id: 'privacy', label: 'Privacy & Visibility', icon: Eye },
    { id: 'business', label: 'Business Settings', icon: Building },
    { id: 'subscription', label: 'Subscription & Billing', icon: Crown },
    { id: 'support', label: 'Support & Assistance', icon: HelpCircle },
    { id: 'legal', label: 'Legal & Policies', icon: FileText },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-3">
        <div>
          <h1 className="text-xl font-black text-[#111111]">Platform Settings</h1>
          <p className="text-xs text-[#667085] mt-0.5">
            Manage your account credentials, notifications, privacy preferences and business
            parameters.
          </p>
        </div>
      </div>

      {/* 2-Column Settings Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Navigation Sidebar (4 cols) */}
        <div className="md:col-span-4 bg-white border border-[#E5E7EB] rounded-2xl p-2 shadow-2xs space-y-1">
          {sections.map((s) => {
            const Icon = s.icon;
            const isActive = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id as typeof activeSection)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#2E3192] text-white shadow-xs'
                    : 'text-[#111111] hover:bg-[#F7F8FC]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#667085]'}`} />
                  <span>{s.label}</span>
                </div>
                <ChevronRight
                  className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#667085]'}`}
                />
              </button>
            );
          })}

          <div className="pt-2 mt-2 border-t border-[#E5E7EB]">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Content Pane (8 cols) */}
        <div className="md:col-span-8 bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-6">
          {/* SECTION 1: ACCOUNT */}
          {activeSection === 'account' && (
            <div className="space-y-5">
              <h2 className="text-base font-bold text-[#111111] pb-3 border-b border-[#E5E7EB]">
                Account Information & Security
              </h2>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#111111] mb-1">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#2E3192]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#111111] mb-1">
                      Registered Phone
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#2E3192]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#2E3192]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    Professional Bio
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="w-full px-3.5 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#2E3192] resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-[#2E3192] hover:bg-[#242775] rounded-xl shadow-xs transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </form>

              {/* Password & 2FA */}
              <div className="pt-4 border-t border-[#E5E7EB] space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                  Security Credentials
                </h3>
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#F7F8FC] border border-[#E5E7EB]">
                  <div className="flex items-center gap-2.5">
                    <Lock className="w-4 h-4 text-[#2E3192]" />
                    <div>
                      <p className="text-xs font-bold text-[#111111]">Account Password</p>
                      <p className="text-[11px] text-[#667085]">Last modified 2 months ago</p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push('/forgot-password')}
                    className="px-3 py-1.5 text-xs font-semibold text-[#2E3192] bg-white border border-[#E5E7EB] rounded-lg hover:bg-gray-50"
                  >
                    Change Password
                  </button>
                </div>
              </div>

              {/* Delete Account */}
              <div className="pt-4 border-t border-rose-100 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700">
                  Danger Zone
                </h3>
                <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50/50 border border-rose-200">
                  <div>
                    <p className="text-xs font-bold text-rose-900">Delete Account</p>
                    <p className="text-[11px] text-rose-700">
                      Permanently delete your profile and trade listings
                    </p>
                  </div>
                  <button
                    onClick={handleDeleteAccount}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-2xs"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: PREFERENCES */}
          {activeSection === 'preferences' && (
            <div className="space-y-5">
              <h2 className="text-base font-bold text-[#111111] pb-3 border-b border-[#E5E7EB]">
                Preferences & Notifications
              </h2>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    Platform Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full p-2 bg-[#F7F8FC] border border-[#E5E7EB] rounded-xl text-[#111111]"
                  >
                    <option value="English">English</option>
                    <option value="Gujarati">Gujarati (ગુજરાતી)</option>
                    <option value="Hindi">Hindi (हिन्दी)</option>
                    <option value="Marathi">Marathi (मराठी)</option>
                  </select>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="flex items-center justify-between p-3 rounded-xl bg-[#F7F8FC] border border-[#E5E7EB] cursor-pointer">
                    <div>
                      <span className="font-bold text-[#111111] block">Email Trade Digest</span>
                      <span className="text-[#667085] text-[11px]">
                        Receive daily enquiry summaries and verified quotes
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={emailAlerts}
                      onChange={(e) => setEmailAlerts(e.target.checked)}
                      className="w-4 h-4 text-[#2E3192] rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-[#F7F8FC] border border-[#E5E7EB] cursor-pointer">
                    <div>
                      <span className="font-bold text-[#111111] block">
                        WhatsApp Immediate Lead Alerts
                      </span>
                      <span className="text-[#667085] text-[11px]">
                        Instant notifications when buyers submit RFQ inquiries
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={whatsappAlerts}
                      onChange={(e) => setWhatsappAlerts(e.target.checked)}
                      className="w-4 h-4 text-[#2E3192] rounded"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: PRIVACY */}
          {activeSection === 'privacy' && (
            <div className="space-y-5">
              <h2 className="text-base font-bold text-[#111111] pb-3 border-b border-[#E5E7EB]">
                Privacy & Discoverability
              </h2>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-[#111111] mb-1">Profile Visibility</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 p-2.5 rounded-xl border border-[#E5E7EB] hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="visibility"
                        value="public"
                        checked={profileVisibility === 'public'}
                        onChange={() => setProfileVisibility('public')}
                      />
                      <div>
                        <span className="font-bold text-[#111111] block">Public (Recommended)</span>
                        <span className="text-[#667085] text-[11px]">
                          Visible to all buyers, search engines, and network members
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-xl border border-[#E5E7EB] hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="visibility"
                        value="verified-only"
                        checked={profileVisibility === 'verified-only'}
                        onChange={() => setProfileVisibility('verified-only')}
                      />
                      <div>
                        <span className="font-bold text-[#111111] block">
                          Verified Businesses Only
                        </span>
                        <span className="text-[#667085] text-[11px]">
                          Only KYC-verified companies can view your contact info
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E5E7EB]">
                  <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#F7F8FC] border border-[#E5E7EB] cursor-pointer">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#111111]">Show Number on Catalog</span>
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                            showPhoneOnCatalog
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {showPhoneOnCatalog ? 'VISIBLE' : 'HIDDEN'}
                        </span>
                      </div>
                      <span className="text-[#667085] text-[11px] block">
                        Allow buyers to view your contact number ({phone || userBusiness?.phone})
                        directly on your catalog storefront
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={showPhoneOnCatalog}
                      onChange={(e) => handleToggleShowPhone(e.target.checked)}
                      className="w-4 h-4 text-[#2E3192] rounded cursor-pointer ml-3 shrink-0"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: BUSINESS */}
          {activeSection === 'business' && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-[#111111] pb-3 border-b border-[#E5E7EB]">
                Business Suite Configuration
              </h2>
              <p className="text-xs text-[#667085]">
                Configure company legal info, GST credentials, manufacturing locations and bank
                details for your supplier profile.
              </p>
              <Link
                href="/business/manage"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#2E3192] hover:bg-[#242775] rounded-xl transition-colors shadow-2xs"
              >
                <span>Open Dedicated Business Dashboard</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* SECTION 5: SUBSCRIPTION */}
          {activeSection === 'subscription' && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-[#111111] pb-3 border-b border-[#E5E7EB]">
                Supporters Premium
              </h2>
              <p className="text-xs text-[#667085]">
                Your plan is currently active. Access invoice receipts and renewal settings.
              </p>
              <Link
                href="/business/premium"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#00AEEF] hover:bg-[#0098d4] rounded-xl transition-colors shadow-2xs"
              >
                <span>View Full Subscription Portal</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* SECTION 6: SUPPORT */}
          {activeSection === 'support' && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-[#111111] pb-3 border-b border-[#E5E7EB]">
                Help & Assistance
              </h2>
              <div className="space-y-2">
                <Link
                  href="/help"
                  className="flex items-center justify-between p-3 rounded-xl border border-[#E5E7EB] hover:bg-gray-50 text-xs font-semibold text-[#111111]"
                >
                  <span>Help Center & FAQs</span>
                  <ChevronRight className="w-4 h-4 text-[#667085]" />
                </Link>
                <Link
                  href="/report-problem"
                  className="flex items-center justify-between p-3 rounded-xl border border-[#E5E7EB] hover:bg-gray-50 text-xs font-semibold text-rose-600"
                >
                  <span>Report a Problem or Abuse</span>
                  <ChevronRight className="w-4 h-4 text-[#667085]" />
                </Link>
              </div>
            </div>
          )}

          {/* SECTION 7: LEGAL */}
          {activeSection === 'legal' && (
            <div className="space-y-3">
              <h2 className="text-base font-bold text-[#111111] pb-3 border-b border-[#E5E7EB]">
                Legal & Governance Documents
              </h2>
              <div className="space-y-2 text-xs">
                <Link
                  href="/privacy"
                  className="flex justify-between p-3 border border-[#E5E7EB] rounded-xl hover:bg-gray-50 font-medium"
                >
                  <span>Privacy Policy</span>
                  <ChevronRight className="w-4 h-4 text-[#667085]" />
                </Link>
                <Link
                  href="/terms"
                  className="flex justify-between p-3 border border-[#E5E7EB] rounded-xl hover:bg-gray-50 font-medium"
                >
                  <span>Terms & Conditions</span>
                  <ChevronRight className="w-4 h-4 text-[#667085]" />
                </Link>
                <Link
                  href="/refund-policy"
                  className="flex justify-between p-3 border border-[#E5E7EB] rounded-xl hover:bg-gray-50 font-medium"
                >
                  <span>Refund & Cancellation Policy</span>
                  <ChevronRight className="w-4 h-4 text-[#667085]" />
                </Link>
                <Link
                  href="/community-guidelines"
                  className="flex justify-between p-3 border border-[#E5E7EB] rounded-xl hover:bg-gray-50 font-medium"
                >
                  <span>Community & Fair Trade Guidelines</span>
                  <ChevronRight className="w-4 h-4 text-[#667085]" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
