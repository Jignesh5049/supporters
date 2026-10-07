'use client';

import React from 'react';
import { Conversation } from '@/types';
import { Avatar } from '@/components/common/Avatar';
import { Search } from 'lucide-react';

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string;
  onSelect: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  searchQuery,
  onSearchChange
}: ConversationListProps) {
  const filtered = conversations.filter((c) =>
    c.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full md:w-80 lg:w-96 border-r border-[#E5E7EB] bg-white flex flex-col h-full shrink-0">
      {/* Header and Search */}
      <div className="p-4 border-b border-[#E5E7EB]">
        <h2 className="text-lg font-black text-[#111111] mb-3">Messages</h2>
        <div className="relative">
          <Search className="w-4 h-4 text-[#667085] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search suppliers & enquiries..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#F7F8FC] border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#2E3192]"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#E5E7EB]/60">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#667085]">
            No conversations match your search.
          </div>
        ) : (
          filtered.map((conv) => {
            const isActive = conv.id === activeId;
            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={`w-full p-4 flex items-start gap-3 text-left transition-colors ${
                  isActive
                    ? 'bg-[#F7F8FC] border-l-4 border-l-[#2E3192]'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="relative shrink-0">
                  <Avatar
                    src={conv.businessAvatar}
                    name={conv.businessName}
                    size="md"
                    verified={conv.businessVerified}
                  />
                  {conv.online && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold text-[#111111] truncate">
                      {conv.businessName}
                    </span>
                    <span className="text-[10px] text-[#667085] shrink-0">
                      {conv.lastMessageTime}
                    </span>
                  </div>

                  <p className="text-xs text-[#667085] line-clamp-1">
                    {conv.lastMessage}
                  </p>

                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-[#00AEEF] font-semibold">
                      {conv.businessCity}
                    </span>
                    {conv.unreadCount > 0 && (
                      <span className="bg-[#2E3192] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
