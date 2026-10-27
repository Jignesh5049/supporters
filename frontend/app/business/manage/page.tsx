'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { FollowListModal } from '@/components/common/FollowListModal';
import {
  Building2,
  Package,
  Wrench,
  FileQuestion,
  Users,
  Eye,
  Plus,
  ArrowRight,
  Settings,
  Edit3,
  FileText,
  Clock,
  MapPin,
  Globe,
  Share2,
  CheckCircle2,
  TrendingUp,
  Sliders,
  ShieldCheck,
  BarChart3
} from 'lucide-react';

function BusinessNavHeaderInner() {
  const pathname = usePathname();
  const { userBusiness } = useApp();

  const links = [
    { label: 'Overview', href: '/business/manage', icon: Building2 },
    { label: 'Manage Posts', href: '/business/posts', icon: FileText },
    { label: 'Catalog Products', href: '/business/products', icon: Package },
    { label: 'Services', href: '/business/services', icon: Wrench },
    { label: 'Received Enquiries', href: '/business/enquiries', icon: FileQuestion },
    { label: 'Trade Analytics', href: '/business/analytics', icon: BarChart3 }
  ];

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2E3192] text-white flex items-center justify-center font-bold text-sm">
            {userBusiness?.name?.slice(0, 2).toUpperCase() || 'BZ'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#111111]">{userBusiness?.name || 'Business Suite'}</h2>
              {userBusiness?.verified && (
                <span className="text-[10px] font-bold text-[#00AEEF] bg-[#00AEEF]/10 px-2 py-0.5 rounded-full">
                  ✓ Verified
                </span>
              )}
            </div>
            <p className="text-xs text-[#667085]">{userBusiness?.city}, {userBusiness?.state} · Business Manager</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/business/${userBusiness?.slug || userBusiness?.id || 'b-1'}`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#111111] bg-[#F7F8FC] hover:bg-gray-100 border border-[#E5E7EB] rounded-xl transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-[#667085]" />
            <span>Storefront</span>
          </Link>
          <Link
            href="/business/settings"
            className="p-1.5 text-[#667085] hover:text-[#111111] bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-2 border-t border-[#E5E7EB]">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#2E3192] text-white shadow-xs'
                  : 'text-[#667085] hover:text-[#111111] hover:bg-[#F7F8FC]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
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
    <Suspense fallback={<div className="h-24 bg-white border border-[#E5E7EB] rounded-2xl animate-pulse" />}>
      <BusinessNavHeaderInner />
    </Suspense>
  );
}

export default function BusinessManagePage() {
  const { userBusiness, posts, products, services, businesses } = useApp();

  // If user does not have a business profile
  if (!userBusiness) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-5 bg-white border border-[#E5E7EB] rounded-3xl p-8 shadow-xs">
        <div className="w-16 h-16 bg-[#2E3192]/10 text-[#2E3192] rounded-3xl flex items-center justify-center mx-auto">
          <Building2 className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-[#111111]">Create Your Business Profile</h1>
          <p className="text-xs text-[#667085] max-w-md mx-auto">
            Showcase your products, services, factory certifications, and trade updates to verified
            wholesale buyers across India.
          </p>
        </div>
        <Link
          href="/business/edit"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2E3192] text-white text-xs font-bold hover:bg-[#242775] transition-all shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Setup Business Profile Now</span>
        </Link>
      </div>
    );
  }

  const businessPosts = posts.filter((p) => p.businessId === userBusiness.id);
  const publishedPostsCount = businessPosts.filter((p) => p.postStatus !== 'Draft' && p.postStatus !== 'Archived').length;
  const draftPostsCount = businessPosts.filter((p) => p.postStatus === 'Draft').length;
  const businessProducts = products.filter((p) => p.businessId === userBusiness.id);
  const businessServices = services.filter((s) => s.businessId === userBusiness.id);

  const completion = userBusiness.profileCompletion || 85;
  const [showFollowersModal, setShowFollowersModal] = useState(false);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Banner Card with Cover & Avatar */}
      <div className="bg-white border border-[#E5E7EB] rounded-3xl overflow-hidden shadow-xs">
        {/* Cover Image banner */}
        <div className="relative h-44 sm:h-56 w-full bg-[#0F172A]">
          {userBusiness.coverImage ? (
            <img
              src={userBusiness.coverImage}
              alt={userBusiness.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-[#2E3192] to-[#A3238E] opacity-70" />
          )}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <Link
              href={`/business/${userBusiness.slug || userBusiness.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/90 hover:bg-white text-[#111111] text-xs font-bold backdrop-blur-md shadow-xs transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-[#2E3192]" />
              <span>View Public Storefront</span>
            </Link>
            <Link
              href="/business/edit"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/90 hover:bg-white text-[#111111] text-xs font-bold backdrop-blur-md shadow-xs transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#667085]" />
              <span>Edit Profile</span>
            </Link>
          </div>
        </div>

        {/* Profile Details Header */}
        <div className="p-6 sm:p-8 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-4 border-white shadow-md bg-white overflow-hidden relative shrink-0 -mt-12 sm:-mt-16">
                <img
                  src={userBusiness.avatar}
                  alt={userBusiness.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-0.5 pt-1 sm:pt-0 sm:pb-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-[#111111]">
                    {userBusiness.name}
                  </h1>
                  {userBusiness.verified && (
                    <span className="text-[11px] font-bold text-[#00AEEF] bg-[#00AEEF]/10 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Verified
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#667085]">
                  {userBusiness.businessType} · {userBusiness.category} · {userBusiness.city}, {userBusiness.state}
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 shrink-0 sm:pb-1">
              <Link
                href="/business/posts"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2E3192] text-white text-xs font-bold hover:bg-[#242775] transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Post</span>
              </Link>
              <Link
                href="/business/settings"
                className="p-2 text-[#667085] hover:text-[#111111] bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                title="Business Settings"
              >
                <Settings className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Profile Completion Bar */}
          <div className="bg-[#F8FAFC] border border-gray-200 rounded-2xl p-4 mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#111111]">
                Profile Completion: {completion}%
              </span>
              <Link href="/business/edit" className="text-[#2E3192] font-bold hover:underline">
                Complete all fields →
              </Link>
            </div>
            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#2E3192] to-emerald-500 h-full rounded-full transition-all"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setShowFollowersModal(true)}
          className="bg-white border border-[#E5E7EB] hover:border-[#2E3192]/40 hover:shadow-md transition-all rounded-2xl p-5 shadow-xs space-y-1 text-left cursor-pointer group"
          title="Click to view followers list"
        >
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-xs font-bold uppercase tracking-wider group-hover:text-[#2E3192]">Followers</span>
            <Users className="w-4 h-4 text-[#2E3192]" />
          </div>
          <p className="text-2xl font-black text-[#111111] group-hover:text-[#2E3192]">
            {userBusiness.followersCount.toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-emerald-600 font-semibold flex items-center justify-between">
            <span>+140 this week</span>
            <span className="text-[#2E3192] text-[10px] font-bold">View list ↗</span>
          </span>
        </button>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-xs font-bold uppercase tracking-wider">Published Posts</span>
            <FileText className="w-4 h-4 text-[#A3238E]" />
          </div>
          <p className="text-2xl font-black text-[#A3238E]">
            {publishedPostsCount}
          </p>
          <span className="text-[11px] text-[#667085]">{draftPostsCount} drafts saved</span>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-xs font-bold uppercase tracking-wider">Products</span>
            <Package className="w-4 h-4 text-[#00AEEF]" />
          </div>
          <p className="text-2xl font-black text-[#00AEEF]">
            {businessProducts.length}
          </p>
          <span className="text-[11px] text-[#667085]">In trade catalogue</span>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-xs font-bold uppercase tracking-wider">Services</span>
            <Wrench className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600">
            {businessServices.length}
          </p>
          <span className="text-[11px] text-[#667085]">Active offerings</span>
        </div>
      </div>

      {/* Main Hub Navigation Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Module 1: Manage Posts */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#A3238E]/10 text-[#A3238E] flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-[#111111]">Manage Updates & Posts</h2>
            <p className="text-xs text-[#667085]">
              Create new announcements, manage drafts, publish or archive posts displayed on your public feed.
            </p>
          </div>
          <Link
            href="/business/posts"
            className="inline-flex items-center justify-between px-4 py-2.5 rounded-xl bg-gray-50 hover:bg-[#A3238E]/5 text-xs font-bold text-[#A3238E] border border-gray-200 transition-colors"
          >
            <span>Open Post Manager</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Module 2: Manage Products & Services */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#00AEEF]/10 text-[#00AEEF] flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-[#111111]">Catalog & Inventory</h2>
            <p className="text-xs text-[#667085]">
              Update your wholesale product specifications, MOQ, pricing units, and service offerings.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/business/products"
              className="text-center px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-xs font-bold text-[#111111] border border-gray-200 transition-colors"
            >
              Products ({businessProducts.length})
            </Link>
            <Link
              href="/business/services"
              className="text-center px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-xs font-bold text-[#111111] border border-gray-200 transition-colors"
            >
              Services ({businessServices.length})
            </Link>
          </div>
        </div>

        {/* Module 3: Business Information & Settings */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#2E3192]/10 text-[#2E3192] flex items-center justify-center font-bold">
              <Sliders className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-[#111111]">Profile & Settings</h2>
            <p className="text-xs text-[#667085]">
              Manage business contact info, Instagram handle, opening hours, Google Maps link, and preferences.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/business/edit"
              className="text-center px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-xs font-bold text-[#2E3192] border border-gray-200 transition-colors"
            >
              Edit Profile
            </Link>
            <Link
              href="/business/settings"
              className="text-center px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-xs font-bold text-[#111111] border border-gray-200 transition-colors"
            >
              Settings
            </Link>
          </div>
        </div>
      </div>

      {/* Business Information Summary Section */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
          <div>
            <h2 className="text-base font-bold text-[#111111]">Storefront Details Overview</h2>
            <p className="text-xs text-[#667085]">
              These details are currently visible to prospective buyers on Supporters
            </p>
          </div>
          <Link
            href="/business/edit"
            className="text-xs font-bold text-[#2E3192] hover:underline flex items-center gap-1"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Information</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-[#F8FAFC] rounded-xl space-y-1">
            <span className="text-[#667085] font-bold block uppercase tracking-wider text-[10px]">
              Instagram Handle
            </span>
            <p className="font-bold text-[#111111]">
              {userBusiness.instagram || 'Not connected'}
            </p>
          </div>

          <div className="p-3 bg-[#F8FAFC] rounded-xl space-y-1">
            <span className="text-[#667085] font-bold block uppercase tracking-wider text-[10px]">
              Website
            </span>
            <p className="font-bold text-[#111111] truncate">
              {userBusiness.website || 'Not added'}
            </p>
          </div>

          <div className="p-3 bg-[#F8FAFC] rounded-xl space-y-1">
            <span className="text-[#667085] font-bold block uppercase tracking-wider text-[10px]">
              Operating Hours
            </span>
            <p className="font-bold text-[#111111]">
              {userBusiness.openingHours || 'Mon - Sat: 9:00 AM - 8:00 PM'}
            </p>
          </div>

          <div className="p-3 bg-[#F8FAFC] rounded-xl space-y-1">
            <span className="text-[#667085] font-bold block uppercase tracking-wider text-[10px]">
              Phone Contact
            </span>
            <p className="font-bold text-[#111111]">{userBusiness.phone}</p>
          </div>

          <div className="p-3 bg-[#F8FAFC] rounded-xl space-y-1 sm:col-span-2">
            <span className="text-[#667085] font-bold block uppercase tracking-wider text-[10px]">
              Address & Maps
            </span>
            <p className="font-bold text-[#111111] truncate">
              {userBusiness.fullAddress || `${userBusiness.addressLine || ''}, ${userBusiness.city}, ${userBusiness.state}`}
            </p>
          </div>
        </div>
      </div>

      {/* Instagram-style Business Followers Modal */}
      <FollowListModal
        isOpen={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        title="Followers"
        subtitle={`${userBusiness.name} · ${userBusiness.followersCount.toLocaleString('en-IN')} Followers`}
        items={businesses
          .filter((b) => b.id !== userBusiness.id)
          .map((b) => ({
            id: b.id,
            name: b.name,
            username: b.slug,
            avatar: b.avatar,
            verified: b.verified,
            category: b.category,
            city: b.city,
            businessType: b.businessType,
          }))}
      />
    </div>
  );
}
