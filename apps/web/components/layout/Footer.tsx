import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full bg-white border-t border-border mt-16 pb-20 lg:pb-10 pt-12">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-10 border-b border-border">
          {/* Brand info */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white shadow-xs">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path
                    d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm-1 16l-4-4 1.41-1.41L11 15.17l6.59-6.59L19 10l-8 8z"
                    fill="#00AEEF"
                  />
                  <circle cx="12" cy="12" r="3" fill="#FFFFFF" />
                </svg>
              </div>
              <span className="text-lg font-black tracking-tight text-primary">Supporters</span>
            </Link>
            <p className="text-xs text-muted-foreground mt-3 max-w-sm leading-relaxed">
              India&apos;s premier social-commerce and business discovery platform. Connecting
              manufacturers, wholesalers, and service providers through social discovery and
              transparent B2B collaboration.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Network Active across 10+ Major Commercial Hubs</span>
            </div>
          </div>

          {/* Column 1: Discovery */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3">
              Explore
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link href="/discover?tab=products" className="hover:text-primary">
                  Browse Products
                </Link>
              </li>
              <li>
                <Link href="/discover?tab=services" className="hover:text-primary">
                  Verified Services
                </Link>
              </li>
              <li>
                <Link href="/discover?tab=businesses" className="hover:text-primary">
                  Business Directory
                </Link>
              </li>
              <li>
                <Link href="/saved" className="hover:text-primary">
                  Saved Listings
                </Link>
              </li>
              <li>
                <Link href="/create" className="hover:text-primary">
                  Post an Update
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Growth */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link href="/referral" className="hover:text-highlight text-highlight font-medium">
                  Invite & Earn
                </Link>
              </li>
              <li>
                <Link href="/subscription" className="hover:text-primary">
                  Supporters Premium
                </Link>
              </li>
              <li>
                <Link href="/business/manage" className="hover:text-primary">
                  Business Suite
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-primary">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/help" className="hover:text-primary">
                  Help & FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal & Trust */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3">
              Trust & Legal
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link href="/privacy" className="hover:text-primary">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-primary">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-primary">
                  Refund & Cancellation
                </Link>
              </li>
              <li>
                <Link href="/community-guidelines" className="hover:text-primary">
                  Community Guidelines
                </Link>
              </li>
              <li>
                <Link href="/report-problem" className="hover:text-primary">
                  Report a Problem
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© 2026 Supporters Technologies India Pvt Ltd. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="text-primary font-semibold">Proudly Built in India</span>
            <span>·</span>
            <span>v2.4.0 Production</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
