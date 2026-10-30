import React from 'react';
import { LegalDocument } from '@/components/common/LegalDocument';

export default function PrivacyPage() {
  const sections = [
    {
      title: 'Information Collected',
      content: [
        'Supporters Technologies India Pvt Ltd collects business contact details, company registration data (GSTIN, trade certificates), and user identity information provided during registration.',
        'We also collect device diagnostics and interaction telemetry to refine platform performance and optimize local business discovery results.'
      ]
    },
    {
      title: 'Use of Trade Information',
      content: [
        'Information shared publicly within products, services, and company profiles is indexed across the Supporters discovery feed to connect you with verified buyers and commercial sellers.',
        'Private communication exchanged via direct enquiry messages is encrypted and never sold to third-party ad networks.'
      ]
    },
    {
      title: 'Data Retention and Account Deletion',
      content: [
        'Users maintain full rights to export their trade records or request permanent account deletion via Account Settings. All associated data will be removed within 30 days.'
      ]
    }
  ];

  return (
    <LegalDocument
      title="Privacy Policy"
      lastUpdated="October 2026"
      sections={sections}
    />
  );
}
