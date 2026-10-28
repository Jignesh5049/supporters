import React from 'react';
import { LegalDocument } from '@/components/common/LegalDocument';

export default function RefundPolicyPage() {
  const sections = [
    {
      title: 'Supporters Premium Subscriptions',
      content: [
        'Annual Supporters Premium subscriptions (₹999/year) carry a 7-day unconditional refund period from initial activation if you are unsatisfied with platform tools.',
        'To request a cancellation and refund, contact billing@supporters.in with your registered GST or invoice ID.',
      ],
    },
    {
      title: 'Commercial Product Transactions',
      content: [
        "Goods purchased directly from independent manufacturers and sellers are subject to the specific seller's commercial return terms, purchase order agreements, and transit inspection terms.",
        'Supporters provides mediation assistance through our dispute resolution team in the event of documented discrepancies.',
      ],
    },
  ];

  return (
    <LegalDocument
      title="Refund & Cancellation Policy"
      lastUpdated="October 2026"
      sections={sections}
    />
  );
}
