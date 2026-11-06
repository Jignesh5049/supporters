'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { CURRENT_USER } from '@/lib/mock-data';
import { Avatar } from '@/components/common/Avatar';
import {
  Home,
  Compass,
  Bookmark,
  MessageSquare,
  Bell,
  Building,
  Package,
  Wrench,
  HelpCircle,
  Gift,
  Crown,
  Settings,
  FileQuestion,
  Wallet,
  FileText,
} from 'lucide-react';

import { Suspense } from 'react';

function SidebarInner() {
  const pathname = usePathname();
  const { unreadNotificationsCount, unreadMessagesCount } = useApp();

  const mainLinks = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Discover', href: '/discover', icon: Compass },
    { label: 'Saved', href: '/saved', icon: Bookmark },
    {
      label: 'Messages',
      href: '/messages',
      icon: MessageSquare,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
      badgeColor: 'bg-info',
    },
    {
      label: 'Notifications',
      href: '/notifications',
      icon: Bell,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
      badgeColor: 'bg-highlight',
    },
  ];

  const businessLinks = [
    { label: 'Business Hub', href: '/business/manage', icon: Building },
    { label: 'Manage Posts', href: '/business/posts', icon: FileText },
    { label: 'My Products', href: '/business/products', icon: Package },
    { label: 'My Services', href: '/business/services', icon: Wrench },
    { label: 'My Enquiries', href: '/business/enquiries', icon: FileQuestion },
  ];

  const growthLinks = [
    { label: 'App Wallet', href: '/wallet', icon: Wallet, highlight: 'text-emerald-600 font-bold' },
    { label: 'Refer & Earn', href: '/referral', icon: Gift, highlight: 'text-highlight' },
    { label: 'Supporters Pro', href: '/subscription', icon: Crown, highlight: 'text-amber-500' },
  ];

  const utilityLinks = [
    { label: 'Settings', href: '/settings', icon: Settings },
    { label: 'Help & Support', href: '/help', icon: HelpCircle },
  ];

  return (
    <aside className="w-64 shrink-0 hidden lg:block sticky top-20 self-start h-[calc(100vh-5.5rem)] z-30">
      <div className="h-full overflow-y-auto no-scrollbar space-y-4 pb-6 pr-1">
        {/* User Mini Profile Card */}
        <Link
          href="/profile"
          className="flex items-center gap-3 p-3 bg-white hover:bg-gray-50 border border-border rounded-2xl transition-all shadow-2xs group"
        >
          <Avatar src={CURRENT_USER.avatar} name={CURRENT_USER.name} size="md" verified />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
              {CURRENT_USER.name}
            </h4>
            <p className="text-xs text-muted-foreground truncate">@{CURRENT_USER.username}</p>
          </div>
        </Link>

        {/* Main Navigation */}
        <div className="bg-white border border-border rounded-2xl p-2 shadow-2xs">
          <nav className="space-y-1">
            {mainLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-white font-semibold shadow-xs'
                      : 'text-foreground hover:bg-background hover:text-primary'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-muted-foreground'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[11px] font-bold text-white px-1.5 py-0.2 rounded-full ${item.badgeColor || 'bg-primary'}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Business Section */}
          <div className="pt-3 mt-3 border-t border-border">
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Business Suite
            </p>
            <nav className="space-y-1">
              {businessLinks.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-primary text-white font-semibold'
                        : 'text-foreground hover:bg-background hover:text-primary'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-muted-foreground'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Referral & Subscription Section */}
          <div className="pt-3 mt-3 border-t border-border">
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Grow & Upgrade
            </p>
            <nav className="space-y-1">
              {growthLinks.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-primary text-white font-semibold'
                        : `text-foreground hover:bg-background ${item.highlight || ''}`
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : ''}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Utility Section */}
          <div className="pt-3 mt-3 border-t border-border">
            <nav className="space-y-1">
              {utilityLinks.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-primary text-white font-semibold'
                        : 'text-muted-foreground hover:bg-background hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function Sidebar() {
  return (
    <Suspense
      fallback={
        <aside className="w-64 shrink-0 hidden lg:block sticky top-20 self-start">
          <div className="h-96 bg-white border border-border rounded-2xl animate-pulse" />
        </aside>
      }
    >
      <SidebarInner />
    </Suspense>
  );
}
