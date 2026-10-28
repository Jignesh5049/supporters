import React from 'react';
import { LegalDocument } from '@/components/common/LegalDocument';

export default function CommunityGuidelinesPage() {
  const sections = [
    {
      title: 'Authentic Business Conduct',
      content: [
        'Supporters is built on genuine Indian trade relationships. We encourage fair pricing, clear minimum order quantities, and realistic turnaround estimates.',
        'Spamming unsolicited enquiry messages or posting misleading promotional pricing is strictly prohibited.',
      ],
    },
    {
      title: 'Fair Review & Feedback Policy',
      content: [
        'Only members with bona fide commercial engagements are permitted to submit customer reviews. Defamatory or artificially manipulated reviews will be removed upon investigation.',
      ],
    },
    {
      title: 'Respectful Communication',
      content: [
        'Harassment, abusive language, or unauthorized solicitation in direct messages will result in immediate loss of verification and permanent platform expulsion.',
      ],
    },
  ];

  return (
    <LegalDocument
      title="Community & Fair Trade Guidelines"
      lastUpdated="October 2026"
      sections={sections}
    />
  );
}
