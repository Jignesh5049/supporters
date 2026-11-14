import { describe, expect, it, vi } from 'vitest';
import { reportErrorMessage } from '@/features/moderation/report-dialog';
import { ApiError } from '@/lib/api/errors';
import { UploadError, uploadKycFile } from './upload';
import { type VerificationDraft, draftProblem, submitErrorMessage } from './verification-request';

const file = (name: string, type: string, size = 1_024) =>
  new File([new Uint8Array(size)], name, { type });

const draft = (overrides: Partial<VerificationDraft> = {}): VerificationDraft => ({
  method: 'gstin',
  registrationNumber: '27AAPFU0939F1ZV',
  certificate: file('gst.pdf', 'application/pdf'),
  ownerIds: [file('id.jpg', 'image/jpeg')],
  ...overrides,
});

describe('draftProblem', () => {
  it('accepts a valid GSTIN or Udyam request', () => {
    expect(draftProblem(draft())).toBeNull();
    expect(
      draftProblem(draft({ method: 'udyam', registrationNumber: 'udyam-mh-01-0012345' })),
    ).toBeNull();
  });

  it('names the first thing to fix, before anything is uploaded', () => {
    expect(draftProblem(draft({ registrationNumber: '27AAPFU0939F1ZX' }))).toBe(
      'Enter a valid GSTIN',
    );
    expect(draftProblem(draft({ method: 'udyam' }))).toBe('Enter a valid Udyam number');
    expect(draftProblem(draft({ certificate: null }))).toBe('Add the certificate');
    expect(draftProblem(draft({ ownerIds: [] }))).toMatch(/photo ID/);
    const three = [1, 2, 3].map((n) => file(`id${n}.jpg`, 'image/jpeg'));
    expect(draftProblem(draft({ ownerIds: three }))).toMatch(/photo ID/);
  });
});

describe('uploadKycFile', () => {
  it('refuses wrong types and oversized files without calling the API', async () => {
    const request = vi.fn();
    const deps = { request, put: vi.fn() } as never;
    await expect(uploadKycFile(file('id.webp', 'image/webp'), deps)).rejects.toThrow(
      'use a PDF, JPEG or PNG',
    );
    await expect(
      uploadKycFile(file('big.pdf', 'application/pdf', 11 * 1024 * 1024), deps),
    ).rejects.toBeInstanceOf(UploadError);
    expect(request).not.toHaveBeenCalled();
  });

  it('presigns with purpose kyc and returns the upload id', async () => {
    const id = '0199f4a0-0000-7000-8000-000000000001';
    const request = vi.fn(async (path: string) =>
      path === '/v1/uploads/presign'
        ? {
            id,
            url: 'https://s3.example/kyc/x',
            method: 'PUT',
            headers: { 'content-type': 'application/pdf' },
            expiresAt: new Date().toISOString(),
          }
        : {
            id,
            purpose: 'kyc',
            status: 'ready',
            contentType: 'application/pdf',
            size: 1024,
            url: null,
          },
    );
    const put = vi.fn(async () => new Response(null, { status: 200 }));
    expect(await uploadKycFile(file('gst.pdf', 'application/pdf'), { request, put } as never)).toBe(
      id,
    );
    expect(request).toHaveBeenCalledWith('/v1/uploads/presign', {
      method: 'POST',
      body: { purpose: 'kyc', contentType: 'application/pdf', size: 1024 },
    });
  });
});

describe('error messages', () => {
  it('explains verification and report refusals', () => {
    expect(
      submitErrorMessage(new ApiError({ status: 409, code: 'VERIFICATION_PENDING', title: 'x' })),
    ).toBe('Your request is already in review.');
    expect(reportErrorMessage(new ApiError({ status: 404, code: 'NOT_FOUND', title: 'x' }))).toBe(
      'This is no longer available.',
    );
    const own = new ApiError({
      status: 400,
      code: 'VALIDATION_FAILED',
      title: 'x',
      fieldErrors: [{ path: 'body.targetId', message: "You can't report your own content" }],
    });
    expect(reportErrorMessage(own)).toBe("You can't report your own content.");
  });
});
