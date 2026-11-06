import React from 'react';
import { VerificationTable } from './verification-table';
import { Card } from '@supporters/ui-web/components/card';
import { ShieldCheck, Info } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function AdminVerificationsPage() {
  return (
    <div className="space-y-6 pb-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-black text-foreground tracking-tight">
          Business KYC Verifications
        </h1>
        <p className="text-xs text-muted-foreground">
          Review business registrations against MCA / GST portal records. Approving enables the verified checkmark badge and quote rights on buyer RFQs.
        </p>
      </div>

      <div className="p-3 bg-muted rounded-xl flex items-center gap-2.5 text-xs text-muted-foreground">
        <Info className="size-4 text-info shrink-0" />
        <span>
          Compliance policy: Documents open via 5-minute pre-signed links in a new tab. Never embed or cache KYC records. Page served with Cache-Control: no-store.
        </span>
      </div>

      <VerificationTable />
    </div>
  );
}
