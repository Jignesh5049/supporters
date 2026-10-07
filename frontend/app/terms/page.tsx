import React from 'react';
import { LegalDocument } from '@/components/common/LegalDocument';

export default function TermsPage() {
  const sections = [
    {
      title: 'Platform Scope and B2B Networking',
      content: [
        'Supporters provides a digital social-business networking and discovery platform. Users act as independent commercial entities responsible for product representations, quotes, and fulfillment.',
        'Users represent that all published specifications, certifications, and inventory quantities accurately reflect bona fide stock availability.'
      ]
    },
    {
      title: 'Verification and Compliance',
      content: [
        'Accounts applying for verification must submit authentic GSTIN and registrar records. Misleading representations or fraudulent trade inquiries will lead to immediate account suspension.'
      ]
    },
    {
      title: 'Zero Intermediary Liability',
      content: [
        'Purchase orders and freight agreements negotiated between members are executed directly. Supporters is not a party to individual purchase contracts.'
      ]
    }
  ];

  return (
    <LegalDocument
      title="Terms & Conditions of Service"
      lastUpdated="October 2026"
      sections={sections}
    />
  );
}
