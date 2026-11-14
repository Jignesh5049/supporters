import {
  createReportSchema,
  myVerificationSchema,
  reportReceiptSchema,
  submitVerificationSchema,
  type CreateReportInput,
  type MyVerification,
  type ReportReceipt,
} from '@supporters/shared';
import type { z } from 'zod';
import type { ApiClient } from './client';

export interface ModerationApi {
  /** The badge state and the latest request (`GET /me/business/verification`). */
  getVerification(): Promise<MyVerification>;
  /** Opens a request with `kyc` upload ids; the business moves to pending. */
  submitVerification(data: z.input<typeof submitVerificationSchema>): Promise<MyVerification>;
  /** Reporting the same thing again returns the first report. */
  report(data: CreateReportInput): Promise<ReportReceipt>;
}

export function createModerationApi(client: ApiClient): ModerationApi {
  return {
    getVerification: () =>
      client.request('/me/business/verification', { schema: myVerificationSchema }),
    submitVerification: (data) =>
      client.request('/me/business/verification', {
        method: 'POST',
        body: submitVerificationSchema.parse(data),
        schema: myVerificationSchema,
      }),
    report: (data) =>
      client.request('/reports', {
        method: 'POST',
        body: createReportSchema.parse(data),
        schema: reportReceiptSchema,
      }),
  };
}
