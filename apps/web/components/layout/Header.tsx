'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Button } from '@supporters/ui-web/components/button';
import { useLogout } from '@/features/auth/auth-api';
import { Avatar } from '@/components/common/Avatar';
import {
  Search,
  Bell,
  MessageSquare,
  Plus,
  Menu,
  X,
  Compass,
  Bookmark,
  Building,
  Gift,
  Crown,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  Wallet,
} from 'lucide-react';

/** The signed-in user as the header shows them; null when signed out. */
export interface HeaderViewer {
  name: string;
}

export function Header({ viewer }: { viewer: HeaderViewer | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    unreadNotificationsCount,
    unreadMessagesCount,
    openConfirmationModal,
    openMobileCreateModal,
  } = useApp();

  const logout = useLogout();
  const viewerName = viewer?.name ?? 'Guest';
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/discover?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/discover');
    }
  };

  const handleLogout = () => {
    setUserDropdownOpen(false);
    openConfirmationModal({
      title: 'Sign Out of Supporters',
      message: 'Are you sure you want to log out of your session?',
      confirmLabel: 'Log Out',
      isDestructive: true,
      onConfirm: () => logout.mutate(),
    });
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-border/ shadow-2xs">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-lg"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-xs group-hover:bg-primary-hover transition-colors">
              {/* Custom Supporters Monogram Icon */}
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path
                  d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm-1 16l-4-4 1.41-1.41L11 15.17l6.59-6.59L19 10l-8 8z"
                  fill="#00AEEF"
                />
                <circle cx="12" cy="12" r="3" fill="#FFFFFF" />
                <circle cx="15" cy="8" r="1.5" fill="#A3238E" />
              </svg>
            </div>
            <span className="text-xl font-black tracking-tight text-primary group-hover:text-primary-hover transition-colors">
              Supporters
            </span>
          </Link>
        </div>

        {/* Center: Search Bar (Desktop) */}
        <div className="hidden md:flex flex-1 max-w-xl mx-2">
          <form onSubmit={handleSearchSubmit} className="w-full relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, services or businesses"
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-full text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:bg-white focus:border-info focus:ring-2 focus:ring-info/20 transition-all"
            />
          </form>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile search button */}
          <Link
            href="/discover"
            className="md:hidden p-2 text-muted-foreground hover:text-primary hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </Link>

          {/* Notifications */}
          {pathname !== '/notifications' && (
            <Link
              href="/notifications"
              className="relative p-2 text-muted-foreground hover:text-primary hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-highlight text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                  {unreadNotificationsCount}
                </span>
              )}
            </Link>
          )}

          {/* Create Button */}
          <Link
            href="/create"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-full shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Create</span>
          </Link>

          {!viewer && (
            <Button asChild size="sm">
              <Link href="/login">Sign In</Link>
            </Button>
          )}

          {/* User Profile Dropdown */}
          <div className="relative" hidden={!viewer}>
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-1.5 p-1 rounded-full hover:ring-2 hover:ring-primary/20 transition-all focus:outline-none"
              aria-expanded={userDropdownOpen}
              aria-label="User profile menu"
            >
              <Avatar name={viewerName} size="sm" />
            </button>

            {userDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-border shadow-xl z-50 py-2 animate-in fade-in duration-100">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-bold text-foreground line-clamp-1">{viewerName}</p>
                  </div>

                  <div className="py-1 text-sm text-foreground">
                    <Link
                      href="/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center px-4 py-2 hover:bg-background gap-2.5"
                    >
                      <span>View Profile</span>
                    </Link>
                    <Link
                      href="/business/manage"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center px-4 py-2 hover:bg-background gap-2.5"
                    >
                      <Building className="w-4 h-4 text-primary" />
                      <span>My Business Dashboard</span>
                    </Link>
                    <Link
                      href="/wallet"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center px-4 py-2 hover:bg-background gap-2.5 text-emerald-600 font-bold"
                    >
                      <Wallet className="w-4 h-4 text-emerald-600" />
                      <span>App Wallet</span>
                    </Link>
                    <Link
                      href="/referral"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center px-4 py-2 hover:bg-background gap-2.5 text-highlight"
                    >
                      <Gift className="w-4 h-4" />
                      <span>Refer & Earn (Up to ₹500)</span>
                    </Link>
                    <Link
                      href="/subscription"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center px-4 py-2 hover:bg-background gap-2.5"
                    >
                      <Crown className="w-4 h-4 text-amber-500" />
                      <span>Supporters Premium</span>
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center px-4 py-2 hover:bg-background gap-2.5"
                    >
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      <span>Settings</span>
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-border">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 gap-2.5 text-left font-medium"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex">
          <div className="w-4/5 max-w-sm bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-border flex items-center justify-between bg-background">
              <div className="flex items-center gap-2">
                <Avatar name={viewerName} size="sm" />
                <p className="text-sm font-bold text-foreground">{viewerName}</p>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 border-b border-border">
              <form
                onSubmit={(e) => {
                  setMobileMenuOpen(false);
                  handleSearchSubmit(e);
                }}
              >
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Supporters..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-background border border-border rounded-lg"
                  />
                </div>
              </form>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1 text-sm font-medium text-foreground">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-background"
              >
                <span>Feed</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
              <Link
                href="/discover"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-background"
              >
                <div className="flex items-center gap-2.5">
                  <Compass className="w-4 h-4 text-info" />
                  <span>Discover</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
              <Link
                href="/saved"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-background"
              >
                <div className="flex items-center gap-2.5">
                  <Bookmark className="w-4 h-4 text-primary" />
                  <span>Saved Items</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
              <Link
                href="/business/manage"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-background"
              >
                <div className="flex items-center gap-2.5">
                  <Building className="w-4 h-4 text-primary" />
                  <span>My Business</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
              <Link
                href="/wallet"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-background text-emerald-600 font-bold"
              >
                <div className="flex items-center gap-2.5">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <span>App Wallet</span>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-600" />
              </Link>
              <Link
                href="/referral"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-background text-highlight"
              >
                <div className="flex items-center gap-2.5">
                  <Gift className="w-4 h-4" />
                  <span>Refer & Earn (Up to ₹500)</span>
                </div>
                <ChevronRight className="w-4 h-4 text-highlight" />
              </Link>
              <Link
                href="/subscription"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-background"
              >
                <div className="flex items-center gap-2.5">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span>Subscription</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-background"
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4 text-muted-foreground" />
                  <span>Settings</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
              <Link
                href="/help"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-background"
              >
                <div className="flex items-center gap-2.5">
                  <HelpCircle className="w-4 h-4 text-muted-foreground" />
                  <span>Help & Support</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            </div>

            <div className="p-4 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openMobileCreateModal();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-white font-semibold rounded-xl text-sm active:scale-95 transition-transform shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Listing</span>
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}
    </header>
  );
}
