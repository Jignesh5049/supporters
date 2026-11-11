'use client';

import {
  type MyVerification,
  VERIFICATION_LIMITS,
  type VerificationMethod,
  submitVerificationSchema,
} from '@supporters/shared';
import { Badge } from '@supporters/ui-web/components/badge';
import { Button } from '@supporters/ui-web/components/button';
import { Input } from '@supporters/ui-web/components/input';
import { Label } from '@supporters/ui-web/components/label';
import { NativeSelect, NativeSelectOption } from '@supporters/ui-web/components/native-select';
import { useMutation } from '@tanstack/react-query';
import { BadgeCheck, Clock, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { FormError } from '@/features/auth/form-field';
import { api } from '@/lib/api/client';
import { ApiError, errorMessage } from '@/lib/api/errors';
import { UploadError, uploadKycFile } from './upload';

const ACCEPT = 'application/pdf,image/jpeg,image/png';

const METHOD_HINTS: Record<VerificationMethod, { number: string; certificate: string }> = {
  gstin: { number: 'GSTIN, e.g. 27AAPFU0939F1ZV', certificate: 'GST registration certificate' },
  udyam: {
    number: 'Udyam number, e.g. UDYAM-MH-01-0012345',
    certificate: 'Udyam registration certificate',
  },
};

export interface VerificationDraft {
  method: VerificationMethod;
  registrationNumber: string;
  certificate: File | null;
  ownerIds: File[];
}

/** Checks the form before any file is uploaded: the number, then the files. */
export function draftProblem(draft: VerificationDraft): string | null {
  const number = submitVerificationSchema.safeParse({
    method: draft.method,
    registrationNumber: draft.registrationNumber,
    certificateUploadId: '0199f4a0-0000-7000-8000-000000000001',
    ownerIdUploadIds: ['0199f4a0-0000-7000-8000-000000000002'],
  });
  if (!number.success) return number.error.issues[0]?.message ?? 'Check the number';
  if (!draft.certificate) return 'Add the certificate';
  const { min, max } = VERIFICATION_LIMITS.ownerIdFiles;
  if (draft.ownerIds.length < min || draft.ownerIds.length > max) {
    return `Add ${min} or ${max} images or PDFs of your photo ID (front and back)`;
  }
  return null;
}

export function submitErrorMessage(error: unknown): string {
  if (error instanceof UploadError) return error.message;
  if (error instanceof ApiError) {
    if (error.code === 'VERIFICATION_PENDING') return 'Your request is already in review.';
    if (error.code === 'ALREADY_VERIFIED') return 'Your business is already verified.';
    if (error.fieldErrors[0]) return error.fieldErrors[0].message;
  }
  return errorMessage(error);
}

/** The owner's verification (product spec, Verification): status, then the request form. */
export function VerificationRequest({ initial }: { initial: MyVerification }) {
  const { status, request } = initial;
  return (
    <div className="space-y-5">
      {status === 'verified' && (
        <StatusNote
          icon={<BadgeCheck aria-hidden />}
          tone="success"
          title="Your business is verified"
        >
          The Verified badge shows on your page and posts. Changing the business name or GSTIN
          removes it until you are verified again.
        </StatusNote>
      )}
      {status === 'pending' && (
        <StatusNote icon={<Clock aria-hidden />} tone="info" title="In review">
          We check your documents within {VERIFICATION_LIMITS.reviewWorkingDays} working days and
          will notify you.
          {request
            ? ` Sent with ${request.method === 'gstin' ? 'GSTIN' : 'Udyam number'} ${request.registrationNumber}.`
            : ''}
        </StatusNote>
      )}
      {status === 'rejected' && request?.rejectionReason && (
        <StatusNote icon={<ShieldAlert aria-hidden />} tone="warning" title="Not approved">
          {request.rejectionReason} Fix this and send a new request below.
        </StatusNote>
      )}
      {(status === 'none' || status === 'rejected') && <RequestForm />}
    </div>
  );
}

function StatusNote({
  icon,
  tone,
  title,
  children,
}: {
  icon: React.ReactNode;
  tone: 'success' | 'info' | 'warning';
  title: string;
  children: React.ReactNode;
}) {
  const styles = {
    success: 'border-success bg-success-soft text-success',
    info: 'border-primary bg-primary-soft text-primary',
    warning: 'border-warning bg-warning-soft text-warning',
  };
  return (
    <div role="status" className={`flex gap-3 rounded-2xl border p-4 ${styles[tone]}`}>
      <span className="[&_svg]:size-5">{icon}</span>
      <div className="space-y-1">
        <p className="text-body-sm font-bold">{title}</p>
        <p className="text-body-sm text-foreground">{children}</p>
      </div>
    </div>
  );
}

function RequestForm() {
  const router = useRouter();
  const [draft, setDraft] = useState<VerificationDraft>({
    method: 'gstin',
    registrationNumber: '',
    certificate: null,
    ownerIds: [],
  });
  const [problem, setProblem] = useState<string | null>(null);
  const ids = { method: useId(), number: useId(), certificate: useId(), ownerIds: useId() };
  const submit = useMutation({
    mutationFn: async () => {
      if (!draft.certificate) throw new UploadError('Add the certificate');
      const certificateUploadId = await uploadKycFile(draft.certificate);
      const ownerIdUploadIds = [];
      for (const file of draft.ownerIds) ownerIdUploadIds.push(await uploadKycFile(file));
      return api.request<MyVerification>('/v1/me/business/verification', {
        method: 'POST',
        body: {
          method: draft.method,
          registrationNumber: draft.registrationNumber,
          certificateUploadId,
          ownerIdUploadIds,
        },
      });
    },
    onSuccess: () => router.refresh(),
  });
  const hints = METHOD_HINTS[draft.method];

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const found = draftProblem(draft);
        setProblem(found);
        if (!found) submit.mutate();
      }}
    >
      <p className="text-body-sm text-muted-foreground">
        Verification is free. Send one certificate and your photo ID. Files stay private: only our
        review team can open them.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={ids.method}>Registration</Label>
          <NativeSelect
            id={ids.method}
            value={draft.method}
            onChange={(event) =>
              setDraft({ ...draft, method: event.target.value as VerificationMethod })
            }
          >
            <NativeSelectOption value="gstin">GSTIN</NativeSelectOption>
            <NativeSelectOption value="udyam">Udyam registration</NativeSelectOption>
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={ids.number}>{draft.method === 'gstin' ? 'GSTIN' : 'Udyam number'}</Label>
          <Input
            id={ids.number}
            placeholder={hints.number}
            autoCapitalize="characters"
            value={draft.registrationNumber}
            onChange={(event) => setDraft({ ...draft, registrationNumber: event.target.value })}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={ids.certificate}>{hints.certificate} (PDF, JPEG or PNG, up to 10 MB)</Label>
        <Input
          id={ids.certificate}
          type="file"
          accept={ACCEPT}
          onChange={(event) => setDraft({ ...draft, certificate: event.target.files?.[0] ?? null })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={ids.ownerIds}>Owner photo ID: front and back (1 or 2 files)</Label>
        <Input
          id={ids.ownerIds}
          type="file"
          accept={ACCEPT}
          multiple
          onChange={(event) =>
            setDraft({ ...draft, ownerIds: Array.from(event.target.files ?? []) })
          }
        />
      </div>
      <FormError message={problem ?? (submit.error ? submitErrorMessage(submit.error) : null)} />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={submit.isPending}>
          {submit.isPending ? 'Sending...' : 'Send for verification'}
        </Button>
        {submit.isPending && <Badge variant="secondary">Uploading files</Badge>}
      </div>
    </form>
  );
}
