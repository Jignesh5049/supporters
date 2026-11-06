'use client';

import type { ListingRef } from '@supporters/shared';
import { Button } from '@supporters/ui-web/components/button';
import { MessageSquare, Send, Share2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ShareModal } from '@/components/common/ShareModal';
import { useApp } from '@/context/AppContext';
import { useOpenConversation } from '@/features/messaging/use-chat';
import { errorMessage } from '@/lib/api/errors';

interface ContactActionsProps {
  /** What the enquiry is about: the listing title or the business name. */
  subject: string;
  businessName: string;
  businessId: string;
  /** The product or service on this page, offered as a card in the chat. */
  listing?: ListingRef;
  /** The canonical URL to share. */
  shareUrl: string;
  layout?: 'row' | 'stack';
}

/** Enquire, message and share. "Message" opens (or finds) the real thread with the business. */
export function ContactActions({
  subject,
  businessName,
  businessId,
  listing,
  shareUrl,
  layout = 'stack',
}: ContactActionsProps) {
  const { openEnquiryModal, showToast } = useApp();
  const router = useRouter();
  const openChat = useOpenConversation();
  const [isShareOpen, setShareOpen] = useState(false);

  function handleMessage() {
    openChat.mutate(businessId, {
      onSuccess: (conversation) => {
        const query = listing ? `?listing=${listing.type}:${listing.id}` : '';
        router.push(`/messages/${conversation.id}${query}`);
      },
      onError: (error) => showToast(errorMessage(error), 'error'),
    });
  }

  return (
    <div className={layout === 'row' ? 'flex flex-wrap items-center gap-2' : 'space-y-2.5'}>
      <Button
        type="button"
        className={layout === 'stack' ? 'w-full' : undefined}
        onClick={() => openEnquiryModal({ title: subject, businessName, businessId, listing })}
      >
        <Send aria-hidden />
        Contact supplier
      </Button>
      <Button
        type="button"
        variant="outline"
        className={layout === 'stack' ? 'w-full' : undefined}
        disabled={openChat.isPending}
        onClick={handleMessage}
      >
        <MessageSquare aria-hidden />
        Message
      </Button>
      <Button
        type="button"
        variant="ghost"
        className={layout === 'stack' ? 'w-full' : undefined}
        onClick={() => setShareOpen(true)}
      >
        <Share2 aria-hidden />
        Share
      </Button>
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setShareOpen(false)}
        title={subject}
        url={shareUrl}
      />
    </div>
  );
}
