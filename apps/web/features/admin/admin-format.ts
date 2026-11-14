import {
  type AdminReport,
  REPORT_REASON_LABELS,
  type ReportAction,
  type ReportTargetType,
  type VerificationDocumentKind,
  type VerificationMethod,
} from '@supporters/shared';

export const DOCUMENT_KIND_LABELS: Record<VerificationDocumentKind, string> = {
  certificate: 'Certificate',
  owner_id: 'Owner photo ID',
};

export const METHOD_LABELS: Record<VerificationMethod, string> = {
  gstin: 'GSTIN',
  udyam: 'Udyam',
};

export const TARGET_TYPE_LABELS: Record<ReportTargetType, string> = {
  post: 'Post',
  comment: 'Comment',
  review: 'Review',
  message: 'Message',
  business: 'Business',
  requirement: 'Requirement',
};

export const ACTION_LABELS: Record<ReportAction, string> = {
  dismiss: 'Dismiss',
  hide: 'Hide content',
  warn: 'Warn author',
  suspend: 'Suspend author',
};

export const reasonLabel = (reason: AdminReport['reason']) => REPORT_REASON_LABELS[reason];

const dateTime = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Kolkata',
});

/** IST, e.g. "6 Nov 2026, 5:03 pm". */
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** The public page of a reported item, when it has one (messages don't). */
export function targetHref(report: Pick<AdminReport, 'targetType' | 'target'>): string | null {
  const { postId, businessSlug } = report.target;
  if ((report.targetType === 'post' || report.targetType === 'comment') && postId) {
    return `/post/${postId}`;
  }
  if (report.targetType === 'business' && businessSlug) return `/business/${businessSlug}`;
  return null;
}

/** Whole working days since `iso` (Mon to Sat), for the "decide within 2 working days" target. */
export function workingDaysSince(iso: string, now = new Date()): number {
  const start = new Date(iso);
  let days = 0;
  const cursor = new Date(start);
  cursor.setDate(cursor.getDate() + 1);
  while (cursor <= now) {
    if (cursor.getDay() !== 0) days += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}
