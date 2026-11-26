import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import { UploadError, type UploadDeps, uploadImage } from './upload';

const ID = '4b0c4c55-3f6d-4b1f-9a51-2b2c0f3c9a40';
const PRESIGNED = {
  id: ID,
  url: 'http://localhost:59000/supporters-media/public/listing/abc?X-Amz-Signature=sig',
  method: 'PUT',
  headers: { 'content-type': 'image/jpeg', 'content-length': '4' },
  expiresAt: '2026-10-31T10:05:00.000Z',
};
const READY = {
  id: ID,
  purpose: 'listing',
  status: 'ready',
  contentType: 'image/jpeg',
  size: 4,
  url: 'http://localhost:59000/supporters-media/public/listing/abc',
};

const jpeg = (size = 4) => new File([new Uint8Array(size)], 'photo.jpg', { type: 'image/jpeg' });

function deps(overrides: Partial<UploadDeps> = {}) {
  const request = vi.fn((path: string) =>
    Promise.resolve(path.endsWith('/complete') ? READY : PRESIGNED),
  ) as unknown as UploadDeps['request'];
  const put = vi.fn<typeof fetch>(() => Promise.resolve(new Response(null, { status: 200 })));
  return { request, put, ...overrides };
}

describe('uploadImage', () => {
  it('presigns, PUTs the file with exactly the signed headers, then completes', async () => {
    const d = deps();
    const file = jpeg();
    await expect(uploadImage(file, 'listing', d)).resolves.toEqual({ id: ID, url: READY.url });

    expect(d.request).toHaveBeenNthCalledWith(1, '/v1/uploads/presign', {
      method: 'POST',
      body: { purpose: 'listing', contentType: 'image/jpeg', size: 4 },
    });
    expect(d.put).toHaveBeenCalledWith(PRESIGNED.url, {
      method: 'PUT',
      headers: PRESIGNED.headers,
      body: file,
      credentials: 'omit',
    });
    expect(d.request).toHaveBeenNthCalledWith(2, `/v1/uploads/${ID}/complete`, { method: 'POST' });
  });

  it('refuses types and sizes the shared upload rules reject, before calling the API', async () => {
    const d = deps();
    const gif = new File([new Uint8Array(4)], 'a.gif', { type: 'image/gif' });
    await expect(uploadImage(gif, 'listing', d)).rejects.toThrow(UploadError);
    const huge = { name: 'big.jpg', type: 'image/jpeg', size: 11 * 1024 * 1024 } as File;
    await expect(uploadImage(huge, 'listing', d)).rejects.toThrow('under 10 MB');
    expect(d.request).not.toHaveBeenCalled();
  });

  it('stops when storage refuses the PUT', async () => {
    const d = deps({ put: vi.fn(() => Promise.resolve(new Response(null, { status: 403 }))) });
    await expect(uploadImage(jpeg(), 'listing', d)).rejects.toMatchObject({
      code: 'UPLOAD_INCOMPLETE',
    });
    expect(d.request).toHaveBeenCalledTimes(1);
  });

  it('reports a network failure on the PUT', async () => {
    const d = deps({ put: vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))) });
    await expect(uploadImage(jpeg(), 'listing', d)).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
  });

  it('passes API errors from complete through (rejected magic bytes)', async () => {
    const rejected = new ApiError({ status: 422, code: 'UPLOAD_REJECTED', title: 'Rejected' });
    const request = vi.fn((path: string) =>
      path.endsWith('/complete') ? Promise.reject(rejected) : Promise.resolve(PRESIGNED),
    ) as unknown as UploadDeps['request'];
    await expect(uploadImage(jpeg(), 'listing', deps({ request }))).rejects.toBe(rejected);
  });
});

describe('while the media job runs', () => {
  const processing = { ...READY, status: 'processing', url: null };
  const failed = {
    ...READY,
    status: 'failed',
    url: null,
    failureReason: 'heic_unsupported',
    failureMessage: 'HEIC photos are not supported. Export the photo as JPEG or PNG and try again.',
  };

  function polling(polls: object[]) {
    const queue = [...polls];
    const sleeps: number[] = [];
    const request = vi.fn((path: string) => {
      if (path.endsWith('/complete')) return Promise.resolve(processing);
      if (path.endsWith('/presign')) return Promise.resolve(PRESIGNED);
      return Promise.resolve(queue.shift() ?? processing);
    }) as unknown as UploadDeps['request'];
    const sleep = vi.fn((ms: number) => {
      sleeps.push(ms);
      return Promise.resolve();
    });
    return { ...deps({ request, sleep }), sleeps };
  }

  it('polls the upload with growing delays until it is ready', async () => {
    const d = polling([processing, processing, processing, processing, processing, READY]);
    const media = await uploadImage(jpeg(), 'listing', d);
    expect(media).toEqual({ id: ID, url: READY.url });
    expect(d.request).toHaveBeenCalledWith(`/v1/uploads/${ID}`);
    expect(d.sleeps).toEqual([500, 750, 1125, 1688, 2532, 3798]);
  });

  it('caps the delay and gives up after the polling timeout', async () => {
    const d = polling([]);
    await expect(uploadImage(jpeg(), 'listing', d)).rejects.toMatchObject({
      code: 'UPLOAD_PROCESSING_TIMEOUT',
    });
    expect(Math.max(...d.sleeps)).toBe(4_000);
    expect(d.sleeps.reduce((sum, ms) => sum + ms, 0)).toBeGreaterThanOrEqual(90_000);
  });

  it("surfaces the API's reason when the job fails", async () => {
    const d = polling([failed]);
    await expect(uploadImage(jpeg(), 'listing', d)).rejects.toMatchObject({
      code: 'UPLOAD_REJECTED',
      message: failed.failureMessage,
    });
  });
});
