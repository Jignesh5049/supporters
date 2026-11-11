'use client';

import {
  REPORT_LIMITS,
  REPORT_REASON_LABELS,
  type ReportReason,
  type ReportReceipt,
  type ReportTargetType,
} from '@supporters/shared';
import { Button } from '@supporters/ui-web/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@supporters/ui-web/components/dialog';
import { Label } from '@supporters/ui-web/components/label';
import { Textarea } from '@supporters/ui-web/components/textarea';
import { useMutation } from '@tanstack/react-query';
import { Flag } from 'lucide-react';
import { useId, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { FormError } from '@/features/auth/form-field';
import { api } from '@/lib/api/client';
import { ApiError, errorMessage } from '@/lib/api/errors';

export const REPORT_TARGET_NOUNS: Record<ReportTargetType, string> = {
  post: 'post',
  comment: 'comment',
  review: 'review',
  message: 'message',
  business: 'business',
  requirement: 'requirement',
};

export const reportContent = (
  targetType: ReportTargetType,
  targetId: string,
  reason: ReportReason,
  details: string,
) =>
  api.request<ReportReceipt>('/v1/reports', {
    method: 'POST',
    body: { targetType, targetId, reason, ...(details.trim() ? { details: details.trim() } : {}) },
  });

/** What to tell the reporter when the API refuses. */
export function reportErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return 'This is no longer available.';
    if (error.code === 'VALIDATION_FAILED' && error.fieldErrors[0]?.path === 'body.targetId') {
      return "You can't report your own content.";
    }
  }
  return errorMessage(error);
}

/**
 * The Report action (product spec, Moderation): a reason, an optional note,
 * then a thank-you. Reporting the same thing twice is fine (the API keeps the
 * first report), so the result reads the same either way.
 */
export function ReportButton({
  targetType,
  targetId,
  size = 'sm',
  label = 'Report',
}: {
  targetType: ReportTargetType;
  targetId: string;
  size?: 'sm' | 'xs';
  label?: string;
}) {
  const { showToast } = useApp();
  const [isOpen, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const ids = { group: useId(), details: useId() };
  const report = useMutation({
    mutationFn: () => reportContent(targetType, targetId, reason ?? 'other', details),
    onSuccess: () => {
      setOpen(false);
      setReason(null);
      setDetails('');
      showToast('Thanks. Our team will review it.');
    },
  });
  const noun = REPORT_TARGET_NOUNS[targetType];

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setOpen(open);
        if (!open) report.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size={size} className="text-muted-foreground">
          <Flag aria-hidden />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this {noun}</DialogTitle>
          <DialogDescription>
            Reports are private. The person you report isn&apos;t told who reported them.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (reason) report.mutate();
          }}
        >
          <fieldset className="space-y-2">
            <legend id={ids.group} className="text-body-sm font-semibold text-foreground">
              Why are you reporting it?
            </legend>
            {(Object.keys(REPORT_REASON_LABELS) as ReportReason[]).map((value) => (
              <label
                key={value}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border px-3 has-checked:border-primary has-checked:bg-primary-soft"
              >
                <input
                  type="radio"
                  name={ids.group}
                  value={value}
                  checked={reason === value}
                  onChange={() => setReason(value)}
                  className="accent-primary"
                />
                <span className="text-body-sm text-foreground">{REPORT_REASON_LABELS[value]}</span>
              </label>
            ))}
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor={ids.details}>Anything else? (optional)</Label>
            <Textarea
              id={ids.details}
              value={details}
              maxLength={REPORT_LIMITS.details.max}
              onChange={(event) => setDetails(event.target.value)}
            />
          </div>
          <FormError message={report.error ? reportErrorMessage(report.error) : null} />
          <DialogFooter>
            <Button type="submit" disabled={!reason || report.isPending}>
              {report.isPending ? 'Sending...' : 'Send report'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
