'use client';

import { Button } from '@supporters/ui-web/components/button';
import { MessageSquare, Send, Share2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ShareModal } from '@/components/common/ShareModal';
import { useApp } from '@/context/AppContext';

interface ContactActionsProps {
  /** What the enquiry is about: the listing title or the business name. */
  subject: string;
  businessName: string;
  businessId: string;
  /** The canonical URL to share. */
  shareUrl: string;
  layout?: 'row' | 'stack';
}

/**
 * Enquire, message and share. Enquiries and chat still open the prototype's
 * modal and inbox until the messaging API lands; nothing here writes data.
 */
export function ContactActions({
  subject,
  businessName,
  businessId,
  shareUrl,
  layout = 'stack',
}: ContactActionsProps) {
  const { openEnquiryModal } = useApp();
  const [isShareOpen, setShareOpen] = useState(false);

  return (
    <div className={layout === 'row' ? 'flex flex-wrap items-center gap-2' : 'space-y-2.5'}>
      <Button
        type="button"
        className={layout === 'stack' ? 'w-full' : undefined}
        onClick={() => openEnquiryModal({ title: subject, businessName, businessId })}
      >
        <Send aria-hidden />
        Contact supplier
      </Button>
      <Button asChild variant="outline" className={layout === 'stack' ? 'w-full' : undefined}>
        <Link href="/messages">
          <MessageSquare aria-hidden />
          Message
        </Link>
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
