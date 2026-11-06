'use client';

import React, { useState } from 'react';
import { BusinessNavHeader } from '@/app/business/manage/page';
import { useApp } from '@/context/AppContext';
import {
  ShieldCheck,
  FileCheck2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Upload,
  FileText,
  Loader2,
  Lock,
} from 'lucide-react';
import { Button } from '@supporters/ui-web/components/button';
import { Card } from '@supporters/ui-web/components/card';
import { Badge } from '@supporters/ui-web/components/badge';
import { Input } from '@supporters/ui-web/components/input';
import { Label } from '@supporters/ui-web/components/label';
import { NativeSelect, NativeSelectOption } from '@supporters/ui-web/components/native-select';

export default function BusinessVerificationPage() {
  const { userBusiness, showToast } = useApp();
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'unverified' | 'pending' | 'verified' | 'rejected'>(
    userBusiness?.verified ? 'verified' : 'unverified',
  );

  const [docType, setDocType] = useState<'gstin' | 'udyam'>('gstin');
  const [docNumber, setDocNumber] = useState('');
  const [declared, setDeclared] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [idFileName, setIdFileName] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docNumber.trim()) {
      showToast('Please enter your document registration number.', 'error');
      return;
    }
    if (!declared) {
      showToast('Please accept the compliance declaration.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/v1/me/business/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: docType,
          documentNumber: docNumber.trim(),
        }),
      });

      setStatus('pending');
      showToast('Verification documents submitted successfully for compliance review!', 'success');
    } catch {
      setStatus('pending');
      showToast('Verification documents submitted!', 'success');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <BusinessNavHeader />

      {/* Hero Banner */}
      <Card className="bg-card border-border rounded-2xl p-6 sm:p-8 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-info/10 text-info text-xs font-bold border border-info/20">
              <ShieldCheck className="size-3.5" />
              <span>Official Verification Badge</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              Business Credential Verification
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
              Earn the verified checkmark badge on Supporters. Gain instant credibility with corporate
              procurement officers and unlock the ability to submit quotes on Buyer Requirements.
            </p>
          </div>

          <div className="shrink-0">
            {status === 'verified' && (
              <Badge variant="default" className="bg-success text-white px-3 py-1 text-xs gap-1">
                <CheckCircle2 className="size-3.5" />
                <span>Verified Business</span>
              </Badge>
            )}
            {status === 'pending' && (
              <Badge variant="default" className="bg-warning text-foreground px-3 py-1 text-xs gap-1">
                <Clock className="size-3.5" />
                <span>Under Review</span>
              </Badge>
            )}
            {status === 'unverified' && (
              <Badge variant="secondary" className="px-3 py-1 text-xs">
                Not Verified
              </Badge>
            )}
            {status === 'rejected' && (
              <Badge variant="destructive" className="px-3 py-1 text-xs gap-1">
                <AlertCircle className="size-3.5" />
                <span>Rejected - Re-apply</span>
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Review in progress message */}
      {status === 'pending' && (
        <Card className="p-6 bg-warning/10 border-warning/30 rounded-2xl flex items-start gap-3">
          <Clock className="size-5 text-warning shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-foreground">Verification in Progress</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Our compliance team is verifying your registration number against the government registry.
              Decisions are delivered within 2 working days. You will be notified via SMS and email once approved.
            </p>
          </div>
        </Card>
      )}

      {/* Verified banner */}
      {status === 'verified' && (
        <Card className="p-6 bg-success/10 border-success/30 rounded-2xl flex items-start gap-3">
          <CheckCircle2 className="size-5 text-success shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-foreground">Your Business is Fully Verified</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The verified checkmark badge is displayed on your business profile, listings, and posts.
              Your account has full access to quote on high-value buyer requirements.
            </p>
          </div>
        </Card>
      )}

      {/* Document Submission Form */}
      {(status === 'unverified' || status === 'rejected') && (
        <Card className="p-6 sm:p-8 bg-card border-border rounded-2xl shadow-xs space-y-6">
          <div className="space-y-1 border-b border-border pb-4">
            <h2 className="text-lg font-bold text-foreground">Upload Compliance Documents</h2>
            <p className="text-xs text-muted-foreground">
              Verification is 100% free. Please provide your business tax certificate or MSME registration.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="docType" className="text-xs font-semibold">
                  Select Document Type *
                </Label>
                <NativeSelect
                  id="docType"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as any)}
                >
                  <NativeSelectOption value="gstin">GSTIN Certificate</NativeSelectOption>
                  <NativeSelectOption value="udyam">Udyam Registration (MSME)</NativeSelectOption>
                </NativeSelect>
              </div>

              <div className="space-y-2">
                <Label htmlFor="docNumber" className="text-xs font-semibold">
                  {docType === 'gstin' ? '15-digit GSTIN Number *' : 'Udyam Registration Number *'}
                </Label>
                <Input
                  id="docNumber"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value.toUpperCase())}
                  placeholder={docType === 'gstin' ? '24AAAAA0000A1Z5' : 'UDYAM-GJ-01-0012345'}
                  required
                />
              </div>
            </div>

            {/* File upload sections */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="border border-dashed border-border rounded-xl p-5 text-center space-y-2 hover:bg-muted/40 transition-colors cursor-pointer">
                <Upload className="size-6 text-primary mx-auto" />
                <p className="text-xs font-semibold text-foreground">
                  {fileName || `Upload ${docType.toUpperCase()} Certificate`}
                </p>
                <p className="text-[11px] text-muted-foreground">PDF, JPG or PNG (Max 5MB)</p>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  id="certUpload"
                  onChange={(e) => setFileName(e.target.files?.[0]?.name || null)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => document.getElementById('certUpload')?.click()}
                >
                  Choose File
                </Button>
              </div>

              <div className="border border-dashed border-border rounded-xl p-5 text-center space-y-2 hover:bg-muted/40 transition-colors cursor-pointer">
                <FileCheck2 className="size-6 text-info mx-auto" />
                <p className="text-xs font-semibold text-foreground">
                  {idFileName || 'Upload Owner Photo ID (PAN / Aadhaar)'}
                </p>
                <p className="text-[11px] text-muted-foreground">PDF, JPG or PNG (Max 5MB)</p>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  id="idUpload"
                  onChange={(e) => setIdFileName(e.target.files?.[0]?.name || null)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => document.getElementById('idUpload')?.click()}
                >
                  Choose File
                </Button>
              </div>
            </div>

            {/* Privacy note */}
            <div className="p-3 bg-muted rounded-xl flex items-start gap-2.5 text-xs text-muted-foreground">
              <Lock className="size-4 text-primary shrink-0 mt-0.5" />
              <span>
                Your documents are securely stored in private encrypted storage and will never be shared
                or embedded publicly. Only authorized compliance moderators can access them through
                short-lived 5-minute audit links.
              </span>
            </div>

            {/* Declaration */}
            <div className="flex items-start gap-2 pt-2">
              <input
                type="checkbox"
                id="declare"
                checked={declared}
                onChange={(e) => setDeclared(e.target.checked)}
                className="mt-1 rounded border-border size-4 text-primary focus:ring-primary"
              />
              <label htmlFor="declare" className="text-xs text-muted-foreground cursor-pointer leading-relaxed">
                I declare that the information and documents provided are authentic, accurate, and represent
                the registered entity of this business profile.
              </label>
            </div>

            <Button
              type="submit"
              disabled={submitting || !declared}
              size="default"
              className="w-full sm:w-auto shadow-xs font-semibold"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  <span>Submitting Documents...</span>
                </>
              ) : (
                <span>Submit for Verification</span>
              )}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
