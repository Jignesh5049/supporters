'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { Avatar } from '@/components/common/Avatar';
import { EmptyState } from '@/components/common/EmptyState';
import { NotificationCategory } from '@/types';
import {
  Bell,
  CheckCheck,
  Building2,
  MessageSquare,
  FileQuestion,
  Gift,
  Crown,
  ChevronRight
} from 'lucide-react';

export default function NotificationsPage() {
  const {
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    unreadNotificationsCount
  } = useApp();

  const [activeCategory, setActiveCategory] = useState<NotificationCategory>('All');

  const categories: NotificationCategory[] = [
    'All',
    'Business',
    'Messages',
    'Enquiries',
    'Referrals',
    'Subscription'
  ];

  const filtered = notifications.filter(
    (n) => activeCategory === 'All' || n.category === activeCategory
  );

  const todayList = filtered.filter((n) => n.timeGroup === 'Today');
  const yesterdayList = filtered.filter((n) => n.timeGroup === 'Yesterday');
  const earlierList = filtered.filter((n) => n.timeGroup === 'Earlier');

  const getCategoryIcon = (cat: NotificationCategory) => {
    switch (cat) {
      case 'Business': return <Building2 className="w-4 h-4 text-[#2E3192]" />;
      case 'Messages': return <MessageSquare className="w-4 h-4 text-[#00AEEF]" />;
      case 'Enquiries': return <FileQuestion className="w-4 h-4 text-emerald-600" />;
      case 'Referrals': return <Gift className="w-4 h-4 text-[#A3238E]" />;
      case 'Subscription': return <Crown className="w-4 h-4 text-amber-500" />;
      default: return <Bell className="w-4 h-4 text-[#2E3192]" />;
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Top Header Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2E3192]/10 text-[#2E3192] flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-[#111111]">Notifications</h1>
              <p className="text-xs text-[#667085]">
                {unreadNotificationsCount} unread trade updates and supplier alerts
              </p>
            </div>
          </div>

          {unreadNotificationsCount > 0 && (
            <button
              onClick={markAllNotificationsAsRead}
              className="flex items-center gap-1.5 text-xs font-bold text-[#2E3192] hover:underline"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 border-t border-[#E5E7EB]">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                activeCategory === cat
                  ? 'bg-[#2E3192] text-white shadow-xs'
                  : 'bg-[#F7F8FC] text-[#667085] hover:text-[#111111]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-6">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notifications in this category"
            description="You are all caught up with business alerts, enquiries, and referrals."
          />
        ) : (
          <>
            {/* Today */}
            {todayList.length > 0 && (
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#667085] px-1">
                  Today
                </h3>
                <div className="space-y-2">
                  {todayList.map((item) => (
                    <NotificationRow
                      key={item.id}
                      item={item}
                      icon={getCategoryIcon(item.category)}
                      onRead={() => markNotificationAsRead(item.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Yesterday */}
            {yesterdayList.length > 0 && (
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#667085] px-1">
                  Yesterday
                </h3>
                <div className="space-y-2">
                  {yesterdayList.map((item) => (
                    <NotificationRow
                      key={item.id}
                      item={item}
                      icon={getCategoryIcon(item.category)}
                      onRead={() => markNotificationAsRead(item.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Earlier */}
            {earlierList.length > 0 && (
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#667085] px-1">
                  Earlier
                </h3>
                <div className="space-y-2">
                  {earlierList.map((item) => (
                    <NotificationRow
                      key={item.id}
                      item={item}
                      icon={getCategoryIcon(item.category)}
                      onRead={() => markNotificationAsRead(item.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function NotificationRow({
  item,
  icon,
  onRead
}: {
  item: any;
  icon: React.ReactNode;
  onRead: () => void;
}) {
  return (
    <Link
      href={item.actionUrl || '#'}
      onClick={onRead}
      className={`block p-4 rounded-2xl border transition-all ${
        !item.read
          ? 'bg-blue-50/50 border-blue-200 shadow-2xs'
          : 'bg-white border-[#E5E7EB] hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start gap-3.5">
        {item.avatar ? (
          <Avatar src={item.avatar} name={item.title} size="md" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-white border border-[#E5E7EB] flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className="text-xs font-bold text-[#111111] flex items-center gap-1.5">
              <span>{item.title}</span>
              {!item.read && (
                <span className="w-2 h-2 rounded-full bg-[#2E3192]" />
              )}
            </span>
            <span className="text-[11px] text-[#667085] shrink-0">{item.time}</span>
          </div>

          <p className="text-xs text-[#667085] leading-relaxed">
            {item.description}
          </p>
        </div>

        <ChevronRight className="w-4 h-4 text-[#667085] shrink-0 self-center" />
      </div>
    </Link>
  );
}
