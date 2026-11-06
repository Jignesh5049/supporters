import { describe, expect, it } from 'vitest';
import { createReportSchema } from './reports';
import { submitVerificationSchema } from './verification';

const ids = [
  '0199f4a0-0000-7000-8000-000000000001',
  '0199f4a0-0000-7000-8000-000000000002',
  '0199f4a0-0000-7000-8000-000000000003',
] as const;

const submission = (overrides: object = {}) => ({
  method: 'gstin',
  registrationNumber: '27AAPFU0939F1ZV',
  certificateUploadId: ids[0],
  ownerIdUploadIds: [ids[1]],
  ...overrides,
});

describe('submitVerificationSchema', () => {
  it('normalises a GSTIN or a Udyam number', () => {
    expect(
      submitVerificationSchema.parse(submission({ registrationNumber: ' 27aapfu0939f1zv ' }))
        .registrationNumber,
    ).toBe('27AAPFU0939F1ZV');
    expect(
      submitVerificationSchema.parse(
        submission({ method: 'udyam', registrationNumber: 'udyam-mh-01-0012345' }),
      ).registrationNumber,
    ).toBe('UDYAM-MH-01-0012345');
  });

  it('checks the number against the method', () => {
    const bad = [
      submission({ registrationNumber: '27AAPFU0939F1ZX' }),
      submission({ method: 'udyam' }),
      submission({ method: 'gstin', registrationNumber: 'UDYAM-MH-01-0012345' }),
    ];
    for (const input of bad) {
      const result = submitVerificationSchema.safeParse(input);
      expect(result.error?.issues[0]?.path).toEqual(['registrationNumber']);
    }
  });

  it('takes one or two distinct ID files', () => {
    expect(submitVerificationSchema.safeParse(submission({ ownerIdUploadIds: [] })).success).toBe(
      false,
    );
    expect(
      submitVerificationSchema.safeParse(submission({ ownerIdUploadIds: [ids[1], ids[2], ids[0]] }))
        .success,
    ).toBe(false);
    expect(
      submitVerificationSchema.safeParse(submission({ ownerIdUploadIds: [ids[0]] })).success,
    ).toBe(false);
    expect(
      submitVerificationSchema.safeParse(submission({ ownerIdUploadIds: [ids[1], ids[2]] }))
        .success,
    ).toBe(true);
  });
});

describe('createReportSchema', () => {
  it('accepts the spec reasons and trims details', () => {
    const parsed = createReportSchema.parse({
      targetType: 'comment',
      targetId: ids[0],
      reason: 'wrong_category',
      details: '  posted in the wrong place ',
    });
    expect(parsed.details).toBe('posted in the wrong place');
    expect(
      createReportSchema.safeParse({ targetType: 'user', targetId: ids[0], reason: 'spam' })
        .success,
    ).toBe(false);
  });
});
