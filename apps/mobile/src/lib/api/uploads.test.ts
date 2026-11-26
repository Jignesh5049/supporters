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

describe('waiting for the media job', () => {
  const upload = (status: string, extra: object = {}) => ({
    id: UPLOAD_ID,
    purpose: 'post',
    status,
    contentType: 'image/webp',
    size: 10,
    url: null,
    ...extra,
  });

  function api(responses: object[]) {
    const queue = [...responses];
    const request = jest.fn(async () => queue.shift() ?? upload('processing'));
    return { api: createUploadsApi({ request } as unknown as ApiClient), request };
  }

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('polls with growing delays until the upload is ready', async () => {
    const { api: uploads, request } = api([upload('processing'), upload('ready')]);
    const statuses: string[] = [];
    const done = uploads.waitUntilReady(upload('processing') as never, (s) => statuses.push(s));
    await jest.advanceTimersByTimeAsync(500);
    await jest.advanceTimersByTimeAsync(750);
    await expect(done).resolves.toMatchObject({ status: 'ready' });
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[0]).toEqual([`/uploads/${UPLOAD_ID}`, expect.anything()]);
    expect(statuses).toEqual(['processing', 'ready']);
  });

  it("throws the reason's text when the job failed", async () => {
    const { api: uploads } = api([upload('failed', { failureReason: 'heic_unsupported' })]);
    const done = uploads.waitUntilReady(upload('processing') as never);
    const assertion = expect(done).rejects.toMatchObject({ code: ApiErrorCode.UploadRejected });
    await jest.advanceTimersByTimeAsync(500);
    await assertion;
    await done.catch((error) => expect(messageForError(error)).toContain('JPEG or PNG'));
  });

  it('gives up after 90 seconds without failing the upload', async () => {
    const { api: uploads } = api([]);
    const done = uploads.waitUntilReady(upload('processing') as never);
    const assertion = expect(done).rejects.toMatchObject({
      code: ApiErrorCode.UploadProcessingTimeout,
    });
    await jest.advanceTimersByTimeAsync(120_000);
    await assertion;
  });

  it('uploadFile returns only once the upload is ready', async () => {
    const blob = { size: 10 } as Blob;
    const original = globalThis.fetch;
    globalThis.fetch = jest.fn(async (_url: string, init?: RequestInit) =>
      init ? ({ ok: true, status: 200 } as Response) : ({ blob: async () => blob } as Response),
    ) as unknown as typeof fetch;
    const responses = [
      {
        id: UPLOAD_ID,
        url: 'https://s3.example.test/put',
        method: 'PUT',
        headers: {},
        expiresAt: '2026-11-04T10:05:00.000Z',
      },
      upload('processing'),
      upload('ready'),
    ];
    const { api: uploads } = api(responses);
    const done = uploads.uploadFile('file:///a.jpg', 'image/jpeg', 'post');
    await jest.advanceTimersByTimeAsync(600);
    await expect(done).resolves.toMatchObject({ status: 'ready' });
    globalThis.fetch = original;
  });
});

describe('weekly post limit', () => {
  it('explains the free plan limit without showing raw server text', () => {
    const message = messageForError(new ApiError(409, ApiErrorCode.PostLimitReached));
    expect(message).toContain(String(PLAN_LIMITS.free.postsPer7Days));
    expect(message).toContain('7 days');
  });
});
