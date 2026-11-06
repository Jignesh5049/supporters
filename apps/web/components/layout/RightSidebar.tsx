'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { Avatar } from '@/components/common/Avatar';
import { Gift, Building2, ArrowRight } from 'lucide-react';

export function RightSidebar() {
  const { businesses, followedBusinessIds, toggleFollowBusiness } = useApp();

  const recommendedBusinesses = businesses.slice(0, 3);

  return (
    <aside className="w-80 shrink-0 hidden xl:block sticky top-20 self-start h-[calc(100vh-5.5rem)] z-30">
      <div className="h-full overflow-y-auto no-scrollbar space-y-4 pb-6 pr-1">
        {/* Referral Program Spotlight Card (#A3238E accent) */}
        <div className="p-4 bg-gradient-to-br from-highlight/5 to-highlight/10 border border-highlight/30 rounded-2xl relative overflow-hidden shadow-2xs">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-highlight text-white flex items-center justify-center shadow-xs">
                <Gift className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-highlight uppercase tracking-wider">
                Invite & Earn
              </span>
            </div>
            <span className="text-[10px] font-semibold bg-highlight text-white px-2 py-0.5 rounded-full">
              Up to ₹500
            </span>
          </div>

          <h4 className="text-sm font-bold text-foreground mt-3">Grow your business network</h4>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Invite fellow manufacturers and retailers. Earn direct wallet credits when they complete
            their profile.
          </p>

          <div className="mt-3.5 flex items-center justify-between pt-2 border-t border-highlight/">
            <code className="text-xs font-mono font-bold text-highlight bg-white px-2 py-1 rounded border border-highlight/">
              SUPPORT123
            </code>
            <Link
              href="/referral"
              className="text-xs font-semibold text-highlight hover:underline flex items-center gap-1"
            >
              <span>Referral Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Recommended Businesses */}
        <div className="bg-white border border-border rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Recommended Businesses</h3>
            </div>
            <Link
              href="/discover?tab=businesses"
              className="text-xs font-semibold text-info hover:underline"
            >
              View All
            </Link>
          </div>

          <div className="space-y-3.5">
            {recommendedBusinesses.map((biz) => {
              const isFollowing = followedBusinessIds.includes(biz.id);
              return (
                <div key={biz.id} className="flex items-start justify-between gap-3">
                  <Link
                    href={`/business/${biz.slug}`}
                    className="flex items-start gap-2.5 min-w-0 group"
                  >
                    <Avatar src={biz.avatar} name={biz.name} size="sm" verified={biz.verified} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground group-hover:text-primary truncate transition-colors">
                        {biz.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {biz.businessType} · {biz.city}
                      </p>
                    </div>
                  </Link>

                  <button
                    onClick={() => toggleFollowBusiness(biz.id)}
                    className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full transition-all ${
                      isFollowing
                        ? 'bg-gray-100 text-muted-foreground hover:bg-gray-200'
                        : 'bg-primary/ text-primary hover:bg-primary hover:text-white'
                    }`}
                  >
                    {isFollowing ? 'Following' : '+ Follow'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Links */}
        <div className="pt-2 flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-muted-foreground px-1">
          <Link href="/about" className="hover:underline">
            About
          </Link>
          <span>·</span>
          <Link href="/privacy" className="hover:underline">
            Privacy
          </Link>
          <span>·</span>
          <Link href="/terms" className="hover:underline">
            Terms
          </Link>
          <span>·</span>
          <Link href="/help" className="hover:underline">
            Help
          </Link>
          <span>·</span>
          <span>© 2026 Supporters</span>
        </div>
      </div>
    </aside>
  );
}
