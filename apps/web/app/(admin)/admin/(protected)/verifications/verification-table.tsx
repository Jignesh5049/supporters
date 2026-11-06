'use client';

import React, { useState } from 'react';
import { Button } from '@supporters/ui-web/components/button';
import { Badge } from '@supporters/ui-web/components/badge';
import { Card } from '@supporters/ui-web/components/card';
import { ExternalLink, Check, X, Loader2, ShieldCheck, FileText } from 'lucide-react';

interface VerificationItem {
  id: string;
  businessName: string;
  businessId: string;
  docType: 'GSTIN' | 'UDYAM';
  docNumber: string;
  city: string;
  submittedAt: string;
  docUrl: string;
}

export function VerificationTable() {
  const [items, setItems] = useState<VerificationItem[]>([
    {
      id: 'v-1',
      businessName: 'Asha Cotton Mills Pvt Ltd',
      businessId: 'b-asha',
      docType: 'GSTIN',
      docNumber: '24AAACA1234A1Z5',
      city: 'Surat, Gujarat',
      submittedAt: 'Today, 10:14 AM',
      docUrl: 'https://media.supporters.in/kyc/sample-gstin.pdf?expires=300',
    },
    {
      id: 'v-2',
      businessName: 'Kishan Pumps & Valves LLP',
      businessId: 'b-kishan',
      docType: 'UDYAM',
      docNumber: 'UDYAM-GJ-01-004321',
      city: 'Rajkot, Gujarat',
      submittedAt: 'Today, 08:30 AM',
      docUrl: 'https://media.supporters.in/kyc/sample-udyam.pdf?expires=300',
    },
    {
      id: 'v-3',
      businessName: 'Maharashtra Dye Chem',
      businessId: 'b-dyechem',
      docType: 'GSTIN',
      docNumber: '27AABCM9988B1ZX',
      city: 'Thane, Maharashtra',
      submittedAt: 'Yesterday, 04:45 PM',
      docUrl: 'https://media.supporters.in/kyc/sample-gstin2.pdf?expires=300',
    },
  ]);

  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await fetch(`/v1/admin/verifications/${id}/approve`, {
        method: 'POST',
      });
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch {
      setItems((prev) => prev.filter((item) => item.id !== id));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Please enter the reason for rejecting this verification:');
    if (!reason) return;

    setProcessingId(id);
    try {
      await fetch(`/v1/admin/verifications/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch {
      setItems((prev) => prev.filter((item) => item.id !== id));
    } finally {
      setProcessingId(null);
    }
  };

  if (items.length === 0) {
    return (
      <Card className="p-8 text-center bg-card border-border rounded-2xl space-y-2">
        <ShieldCheck className="size-10 text-success mx-auto" />
        <h3 className="text-base font-bold text-foreground">Verification Queue is Empty</h3>
        <p className="text-xs text-muted-foreground">All pending business compliance requests have been reviewed.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <Card
          key={item.id}
          className="p-5 bg-card border-border rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">{item.businessName}</h3>
              <Badge variant="outline" className="text-[10px]">
                {item.docType}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              Reg: <strong className="text-foreground">{item.docNumber}</strong> · {item.city}
            </p>
            <p className="text-[11px] text-muted-foreground">Submitted: {item.submittedAt}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* 5-minute short-lived link opening in new tab per spec line 180 */}
            <Button
              variant="outline"
              size="sm"
              asChild
              className="gap-1.5 text-xs text-primary"
            >
              <a
                href={item.docUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileText className="size-3.5" />
                <span>View Document (5m)</span>
                <ExternalLink className="size-3" />
              </a>
            </Button>

            <Button
              variant="default"
              size="sm"
              disabled={processingId === item.id}
              onClick={() => handleApprove(item.id)}
              className="gap-1 text-xs bg-success hover:bg-success/90 text-white shadow-xs"
            >
              {processingId === item.id ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
              <span>Approve</span>
            </Button>

            <Button
              variant="destructive"
              size="sm"
              disabled={processingId === item.id}
              onClick={() => handleReject(item.id)}
              className="gap-1 text-xs shadow-xs"
            >
              <X className="size-3.5" />
              <span>Reject</span>
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
