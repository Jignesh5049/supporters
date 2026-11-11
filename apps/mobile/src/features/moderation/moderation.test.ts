import { ApiError } from '../../lib/api/errors';
import {
  type KycFile,
  type VerificationDraft,
  kycFileProblem,
  reportErrorMessage,
  submitVerification,
  useReportStore,
  verificationDraftProblem,
  verificationErrorMessage,
} from './moderation';

const file = (name: string, contentType: string, size = 2_048): KycFile => ({
  uri: `file:///cache/${name}`,
  name,
  contentType,
  size,
});

const draft = (overrides: Partial<VerificationDraft> = {}): VerificationDraft => ({
  method: 'gstin',
  registrationNumber: '27AAPFU0939F1ZV',
  certificate: file('gst.pdf', 'application/pdf'),
  ownerIds: [file('id-front.jpg', 'image/jpeg')],
  ...overrides,
});

describe('verificationDraftProblem', () => {
  it('accepts a GSTIN or a Udyam request', () => {
    expect(verificationDraftProblem(draft())).toBeNull();
    expect(
      verificationDraftProblem(
        draft({ method: 'udyam', registrationNumber: 'udyam-mh-01-0012345' }),
      ),
    ).toBeNull();
  });

  it('names the first thing to fix', () => {
    expect(verificationDraftProblem(draft({ registrationNumber: '27AAPFU0939F1ZX' }))).toBe(
      'Enter a valid GSTIN',
    );
    expect(verificationDraftProblem(draft({ method: 'udyam' }))).toBe('Enter a valid Udyam number');
    expect(verificationDraftProblem(draft({ certificate: null }))).toBe('Add the certificate');
    expect(verificationDraftProblem(draft({ ownerIds: [] }))).toBe('Add your photo ID');
    const three = ['a', 'b', 'c'].map((n) => file(`${n}.jpg`, 'image/jpeg'));
    expect(verificationDraftProblem(draft({ ownerIds: three }))).toMatch(/at most 2/);
    expect(
      verificationDraftProblem(draft({ certificate: file('gst.webp', 'image/webp') })),
    ).toMatch(/PDF, JPEG or PNG/);
  });
});

describe('kycFileProblem', () => {
  it('takes PDFs, JPEGs and PNGs up to 10 MB', () => {
    expect(kycFileProblem(file('a.png', 'image/png'))).toBeNull();
    expect(kycFileProblem(file('a.heic', 'image/heic'))).toMatch(/PDF, JPEG or PNG/);
    expect(kycFileProblem(file('a.pdf', 'application/pdf', 11 * 1024 * 1024))).toMatch(/10 MB/);
  });
});

describe('submitVerification', () => {
  it('uploads every file as kyc, in order, then opens the request', async () => {
    const calls: string[] = [];
    const uploads = {
      uploadFile: jest.fn(async (uri: string, _type: string, purpose: string) => {
        calls.push(`${purpose}:${uri.split('/').pop()}`);
        return { id: `id-${calls.length}` } as never;
      }),
    };
    const submit = jest.fn(async () => ({ status: 'pending', request: null }) as never);
    await submitVerification(
      draft({ ownerIds: [file('front.jpg', 'image/jpeg'), file('back.jpg', 'image/jpeg')] }),
      { uploads, submit },
    );
    expect(calls).toEqual(['kyc:gst.pdf', 'kyc:front.jpg', 'kyc:back.jpg']);
    expect(submit).toHaveBeenCalledWith({
      method: 'gstin',
      registrationNumber: '27AAPFU0939F1ZV',
      certificateUploadId: 'id-1',
      ownerIdUploadIds: ['id-2', 'id-3'],
    });
  });

  it('sends nothing when an upload fails', async () => {
    const uploads = { uploadFile: jest.fn(async () => Promise.reject(new Error('offline'))) };
    const submit = jest.fn();
    await expect(submitVerification(draft(), { uploads, submit })).rejects.toThrow('offline');
    expect(submit).not.toHaveBeenCalled();
  });
});

describe('report store and messages', () => {
  it('opens and closes the one report sheet', () => {
    useReportStore.getState().open('message', 'm1');
    expect(useReportStore.getState().target).toEqual({ type: 'message', id: 'm1' });
    useReportStore.getState().close();
    expect(useReportStore.getState().target).toBeNull();
  });

  it('explains refusals', () => {
    expect(reportErrorMessage(new ApiError(404, 'NOT_FOUND'))).toBe('This is no longer available.');
    const own = new ApiError(400, 'VALIDATION_FAILED', {
      fieldErrors: [{ path: 'body.targetId', message: "You can't report your own content" }],
    });
    expect(reportErrorMessage(own)).toBe("You can't report your own content.");
    expect(verificationErrorMessage(new ApiError(409, 'VERIFICATION_PENDING'))).toBe(
      'Your request is already in review.',
    );
  });
});
