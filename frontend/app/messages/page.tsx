'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { ConversationList } from '@/components/messaging/ConversationList';
import { MessageWindow } from '@/components/messaging/MessageWindow';
import { EmptyState } from '@/components/common/EmptyState';
import { MessageSquare } from 'lucide-react';

export default function MessagesPage() {
  const { conversations, activeConversationId, setActiveConversationId } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) || conversations[0];

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setMobileShowChat(true);
  };

  return (
    <div className="h-[calc(100vh-5.5rem)] flex flex-col space-y-3">
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-[#667085]">Direct Trade Communications</span>
      </div>
      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-2xs overflow-hidden flex flex-1 min-h-0">
        {/* Left: Conversation List */}
        <div className={`${mobileShowChat ? 'hidden md:flex' : 'flex'} w-full md:w-auto h-full`}>
          <ConversationList
            conversations={conversations}
            activeId={activeConversationId}
            onSelect={handleSelectConversation}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>

        {/* Right: Active Chat Window */}
        <div className={`${!mobileShowChat ? 'hidden md:flex' : 'flex'} flex-1 h-full`}>
          {activeConversation ? (
            <MessageWindow
              conversation={activeConversation}
              onBackMobile={() => setMobileShowChat(false)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 bg-[#F7F8FC]">
              <EmptyState
                icon={MessageSquare}
                title="Select a Conversation"
                description="Choose an existing inquiry or reach out to any verified business on Supporters to start chatting."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
