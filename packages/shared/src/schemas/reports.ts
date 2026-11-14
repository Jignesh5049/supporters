import { z } from 'zod';
import { REPORT_LIMITS } from '../limits';

// Reports (product spec, "Feed and social: Moderation"; backend spec, Trust and safety).

/** What can be reported. Reviews and requirements are accepted once those features ship. */
export const ReportTargetType = {
  Post: 'post',
  Comment: 'comment',
  Review: 'review',
  Message: 'message',
  Business: 'business',
  Requirement: 'requirement',
} as const;
export type ReportTargetType = (typeof ReportTargetType)[keyof typeof ReportTargetType];
export const reportTargetTypeSchema = z.enum(Object.values(ReportTargetType));

export const ReportReason = {
  Spam: 'spam',
  Fraud: 'fraud',
  Offensive: 'offensive',
  WrongCategory: 'wrong_category',
  Other: 'other',
} as const;
export type ReportReason = (typeof ReportReason)[keyof typeof ReportReason];
export const reportReasonSchema = z.enum(Object.values(ReportReason));

/** Labels for the report sheet, in display order. */
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: 'Spam',
  fraud: 'Fraud or scam',
  offensive: 'Offensive',
  wrong_category: 'Wrong category',
  other: 'Something else',
};

export const ReportStatus = { Open: 'open', Actioned: 'actioned', Dismissed: 'dismissed' } as const;
export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];
export const reportStatusSchema = z.enum(Object.values(ReportStatus));

/** What an admin does about a report. It applies to every open report on the same target. */
export const ReportAction = {
  /** Nothing wrong: closes the reports and shows the content again if it was hidden. */
  Dismiss: 'dismiss',
  Hide: 'hide',
  /** Notifies the author; the content stays as it is. */
  Warn: 'warn',
  /** Suspends the author (signing them out everywhere) and hides the content. */
  Suspend: 'suspend',
} as const;
export type ReportAction = (typeof ReportAction)[keyof typeof ReportAction];
export const reportActionSchema = z.enum(Object.values(ReportAction));

export const createReportSchema = z.strictObject({
  targetType: reportTargetTypeSchema,
  targetId: z.uuid(),
  reason: reportReasonSchema,
  details: z.string().trim().max(REPORT_LIMITS.details.max).optional(),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;

/** Reporting the same thing again returns the first report (200 instead of 201). */
export const reportReceiptSchema = z.object({ id: z.uuid() });
export type ReportReceipt = z.infer<typeof reportReceiptSchema>;
