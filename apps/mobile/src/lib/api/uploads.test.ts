import { PLAN_LIMITS } from '@supporters/shared';
import type { ApiClient } from './client';
import { ApiError, ApiErrorCode, messageForError } from './errors';
import { createUploadsApi } from './uploads';

const UPLOAD_ID = '00000000-0000-4000-8000-000000000001';

describe('uploadFile', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function setup(putStatus = 200) {
    const blob = { size: 4321 } as Blob;
    const fetchMock = jest.fn(async (url: string, init?: RequestInit) => {
      if (!init) return { blob: async () => blob } as Response;
      return { ok: putStatus < 400, status: putStatus } as Response;
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const request = jest.fn(async (path: string) =>
      path === '/uploads/presign'
        ? {
            id: UPLOAD_ID,
            url: 'https://s3.example.test/put',
            method: 'PUT',
            headers: { 'Content-Length': '4321' },
            expiresAt: '2026-11-04T10:05:00.000Z',
          }
        : {
            id: UPLOAD_ID,
            purpose: 'post',
            status: 'ready',
            contentType: 'image/jpeg',
            size: 4321,
            url: null,
          },
    );
    return { api: createUploadsApi({ request } as unknown as ApiClient), request, fetchMock };
  }

  it('presigns with the real size, PUTs with the signed headers, then completes', async () => {
    const { api, request, fetchMock } = setup();
    const upload = await api.uploadFile('file:///photo.jpg', 'image/jpeg', 'post');

    expect(request.mock.calls[0]).toEqual([
      '/uploads/presign',
      expect.objectContaining({
        method: 'POST',
        body: { purpose: 'post', contentType: 'image/jpeg', size: 4321 },
      }),
    ]);
    const put = fetchMock.mock.calls[1];
    expect(put[0]).toBe('https://s3.example.test/put');
    expect(put[1]).toMatchObject({
      method: 'PUT',
      headers: { 'Content-Length': '4321', 'Content-Type': 'image/jpeg' },
    });
    expect(request.mock.calls[1][0]).toBe(`/uploads/${UPLOAD_ID}/complete`);
    expect(upload.status).toBe('ready');
  });

  it('does not complete an upload whose PUT failed', async () => {
    const { api, request } = setup(403);
    await expect(api.uploadFile('file:///photo.jpg', 'image/jpeg', 'post')).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(request).toHaveBeenCalledTimes(1);
  });
});

describe('weekly post limit', () => {
  it('explains the free plan limit without showing raw server text', () => {
    const message = messageForError(new ApiError(409, ApiErrorCode.PostLimitReached));
    expect(message).toContain(String(PLAN_LIMITS.free.postsPer7Days));
    expect(message).toContain('7 days');
  });
});
