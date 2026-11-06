'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Home, Compass, Plus, MessageSquare, User } from 'lucide-react';
import { Suspense } from 'react';

function MobileNavigationInner() {
  const pathname = usePathname();
  const { unreadMessagesCount, openMobileCreateModal } = useApp();

  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Discover', href: '/discover', icon: Compass },
    { label: 'Create', href: '/create', icon: Plus, isAction: true },
    {
      label: 'Messages',
      href: '/messages',
      icon: MessageSquare,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
    },
    { label: 'Profile', href: '/profile', icon: User },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-border/ px-3 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          if (item.isAction) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={openMobileCreateModal}
                className="flex flex-col items-center justify-center -mt-5 group focus:outline-none"
                aria-label="Create Post, Product or Service"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-primary-hover text-white flex items-center justify-center shadow-lg shadow-primary/25 group-hover:scale-105 active:scale-90 transition-all ring-4 ring-white">
                  <Plus className="w-6 h-6 stroke-[2.5]" />
                </div>
                <span className="text-[10px] font-bold text-primary mt-0.5 tracking-tight">
                  Create
                </span>
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl relative transition-all active:scale-95 ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.3] scale-105' : 'stroke-[1.8]'}`}
                />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2 bg-info text-white text-[9px] font-black px-1.5 py-0.2 rounded-full border-2 border-white shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] mt-0.5 tracking-tight ${isActive ? 'font-bold text-primary' : 'font-medium'}`}
              >
                {item.label}
              </span>
              {isActive && <span className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function MobileNavigation() {
  return (
    <Suspense fallback={null}>
      <MobileNavigationInner />
    </Suspense>
  );
}
