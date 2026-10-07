'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  X,
  Package,
  Wrench,
  Megaphone,
  Percent,
  FileEdit,
  ArrowRight,
  Zap
} from 'lucide-react';

export function MobileCreateModal() {
  const router = useRouter();
  const {
    mobileCreateModalOpen,
    closeMobileCreateModal,
    draftListing,
    clearDraftListing
  } = useApp();

  // Close modal on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileCreateModalOpen) {
        closeMobileCreateModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileCreateModalOpen, closeMobileCreateModal]);

  // Ensure body scroll is always free and never locked
  useEffect(() => {
    document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileCreateModalOpen]);

  if (!mobileCreateModalOpen) return null;

  const handleNavigate = (path: string) => {
    closeMobileCreateModal();
    router.push(path);
  };

  const createOptions = [
    {
      title: 'List a Product',
      badge: 'B2B & Retail',
      badgeClass: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
      description: 'Showcase physical items, wholesale inventory, MOQ & catalog specs',
      icon: Package,
      iconBg: 'bg-gradient-to-br from-[#2E3192] to-[#4338CA]',
      path: '/create?tab=product'
    },
    {
      title: 'Add a Service',
      badge: 'Custom Quotes',
      badgeClass: 'bg-sky-50 text-sky-700 border border-sky-100',
      description: 'Highlight bespoke manufacturing, repairs, consulting or turnkey work',
      icon: Wrench,
      iconBg: 'bg-gradient-to-br from-[#00AEEF] to-[#0284C7]',
      path: '/create?tab=service'
    },
    {
      title: 'Share an Update',
      badge: 'Social Feed',
      badgeClass: 'bg-purple-50 text-purple-700 border border-purple-100',
      description: 'Post factory dispatch, milestones, photos, videos or attach catalog items',
      icon: Megaphone,
      iconBg: 'bg-gradient-to-br from-[#4F46E5] to-[#6366F1]',
      path: '/create?tab=post'
    },
    {
      title: 'Launch an Offer',
      badge: 'Promoted',
      badgeClass: 'bg-pink-50 text-pink-700 border border-pink-100',
      description: 'Flash discounts, wholesale volume slabs, or seasonal clearance deals',
      icon: Percent,
      iconBg: 'bg-gradient-to-br from-[#A3238E] to-[#BE185D]',
      path: '/create?tab=offer'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
      {/* Dimmed Backdrop */}
      <div
        className="fixed inset-0 bg-black/55 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={closeMobileCreateModal}
        aria-hidden="true"
      />

      {/* Bottom Sheet Modal */}
      <div
        className="relative z-10 w-full max-w-lg mx-auto bg-white rounded-t-[32px] px-5 pt-3 pb-8 shadow-2xl border-t border-gray-100 animate-in slide-in-from-bottom duration-300 max-h-[88vh] overflow-y-auto no-scrollbar overscroll-contain"
        role="dialog"
        aria-modal="true"
        aria-label="Create on Supporters"
      >
        {/* App Sheet Drag Handle Indicator */}
        <div className="w-12 h-1.5 bg-gray-300/80 rounded-full mx-auto mb-4" />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xl font-black text-[#111111] tracking-tight">
                Create on Supporters
              </h2>
              <span className="w-6 h-6 rounded-full bg-blue-50 text-[#2E3192] flex items-center justify-center shadow-2xs">
                <Zap className="w-3.5 h-3.5 fill-[#2E3192]" />
              </span>
            </div>
            <p className="text-xs text-[#667085] mt-1 leading-snug">
              Showcase your business to verified buyers and trade partners across India
            </p>
          </div>

          <button
            onClick={closeMobileCreateModal}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center shrink-0 active:scale-95 transition-all"
            aria-label="Close creation menu"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Unsaved Listing / Quick Resume Banner - ONLY rendered when draftListing is available */}
        {draftListing && (
          <div className="mb-4 bg-[#F2F5FF] border border-[#D5E0FF] rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 shadow-2xs animate-in fade-in duration-200">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#E0E8FF] text-[#2E3192] flex items-center justify-center shrink-0 shadow-xs">
                <FileEdit className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#2E3192] block leading-tight">
                  UNSAVED LISTING
                </span>
                <p className="text-xs font-bold text-[#111111] truncate mt-0.5">
                  {draftListing.title || 'Untitled Draft'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() =>
                  handleNavigate(
                    draftListing.resumeUrl ||
                      `/create?tab=${draftListing.type || 'product'}&draft=${draftListing.id}`
                  )
                }
                className="px-3.5 py-1.5 bg-[#2E3192] hover:bg-[#242775] active:scale-95 text-white text-xs font-bold rounded-full flex items-center gap-1.5 shadow-xs transition-transform"
              >
                <span>Resume</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearDraftListing();
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                title="Discard Draft"
                aria-label="Discard Draft"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Action Options List */}
        <div className="space-y-2.5">
          {createOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.title}
                onClick={() => handleNavigate(option.path)}
                className="w-full text-left p-3.5 bg-white hover:bg-gray-50/80 active:bg-gray-100/90 border border-[#E5E7EB] rounded-2xl flex items-start gap-3.5 shadow-2xs transition-all active:scale-[0.98] group"
              >
                {/* Squircle Icon */}
                <div
                  className={`w-12 h-12 rounded-2xl ${option.iconBg} text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform`}
                >
                  <Icon className="w-6 h-6 stroke-[2.2]" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[#111111] group-hover:text-[#2E3192] transition-colors">
                      {option.title}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${option.badgeClass}`}>
                      {option.badge}
                    </span>
                  </div>
                  <p className="text-xs text-[#667085] mt-1 leading-relaxed">
                    {option.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
