import type { PresignedUpload } from '@supporters/shared';
import { myBusiness, product } from '../../features/catalog/test-fixtures';
import { createCatalogApi } from './catalog';
import type { ApiClient, RequestOptions } from './client';
import { ApiError, ApiErrorCode } from './errors';
import { createMyBusinessApi } from './my-business';
import { createUploadsApi, type PutFile } from './uploads';

const UPLOAD_ID = '7c5a9e8f-0d1b-4c23-9e45-e6f7a8b9c0d1';

/** Records calls and answers each path from a table, parsing with the caller's schema. */
function fakeClient(responses: Record<string, unknown | (() => never)>) {
  const calls: { path: string; options: RequestOptions<unknown> }[] = [];
  const client: ApiClient = {
    request: async <T>(path: string, options: RequestOptions<T> = {}) => {
      calls.push({ path, options: options as RequestOptions<unknown> });
      const response = responses[path];
      if (typeof response === 'function') return response() as T;
      return (options.schema ? options.schema.parse(response) : undefined) as T;
    },
    refreshSession: async () => true,
  };
  return { client, calls };
}

const notFound = () => {
  throw new ApiError(404, ApiErrorCode.NotFound);
};

describe('catalog API', () => {
  it('pages with an encoded cursor', async () => {
    const { client, calls } = fakeClient({
      [`/businesses/${myBusiness.id}/products?cursor=a%2Bb`]: { data: [product], nextCursor: null },
    });
    const page = await createCatalogApi(client).businessProducts(myBusiness.id, 'a+b');
    expect(page.data[0]?.title).toBe(product.title);
    expect(calls[0]?.path).toBe(`/businesses/${myBusiness.id}/products?cursor=a%2Bb`);
  });
});

describe('my business API', () => {
  it('resolves null before onboarding', async () => {
    const { client } = fakeClient({ '/me/business': notFound });
    await expect(createMyBusinessApi(client).get()).resolves.toBeNull();
  });

  it('passes other errors on', async () => {
    const { client } = fakeClient({
      '/me/business': () => {
        throw new ApiError(503, ApiErrorCode.ServiceUnavailable);
      },
    });
    await expect(createMyBusinessApi(client).get()).rejects.toMatchObject({ status: 503 });
  });

  it('filters the owner list by status', async () => {
    const { client, calls } = fakeClient({
      '/me/business/products?status=draft': { data: [], nextCursor: null },
    });
    await createMyBusinessApi(client).products(null, 'draft');
    expect(calls[0]?.path).toBe('/me/business/products?status=draft');
  });
});

describe('uploads API', () => {
  const presigned: PresignedUpload = {
    id: UPLOAD_ID,
    url: 'https://storage.example.test/listing/abc?signature=x',
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg', 'Content-Length': '4' },
    expiresAt: '2026-10-30T10:15:00.000Z',
  };
  const ready = {
    id: UPLOAD_ID,
    purpose: 'listing',
    status: 'ready',
    contentType: 'image/jpeg',
    size: 4,
    url: 'https://media.example.test/abc.jpg',
  };
  const file = { body: new Blob(['abcd'], { type: 'image/jpeg' }), contentType: 'image/jpeg' };

  it('presigns, PUTs to storage, then completes', async () => {
    const { client, calls } = fakeClient({
      '/uploads/presign': presigned,
      [`/uploads/${UPLOAD_ID}/complete`]: ready,
    });
    const putFile = jest.fn<ReturnType<PutFile>, Parameters<PutFile>>(
      async () => new Response(null, { status: 200 }),
    );

    const upload = await createUploadsApi(client, putFile).upload('listing', file);

    expect(upload.url).toBe(ready.url);
    expect(calls.map((call) => call.path)).toEqual([
      '/uploads/presign',
      `/uploads/${UPLOAD_ID}/complete`,
    ]);
    expect(calls[0]?.options.body).toEqual({
      purpose: 'listing',
      contentType: 'image/jpeg',
      size: 4,
    });
    expect(putFile).toHaveBeenCalledWith(presigned, file);
  });

  it('refuses a file type the API would reject, before presigning', async () => {
    const { client, calls } = fakeClient({});
    const pdf = { body: new Blob(['%PDF']), contentType: 'application/pdf' };
    await expect(createUploadsApi(client).upload('listing', pdf)).rejects.toMatchObject({
      code: ApiErrorCode.UploadNotAllowed,
    });
    expect(calls).toHaveLength(0);
  });

  it('stops when storage refuses the PUT', async () => {
    const { client, calls } = fakeClient({ '/uploads/presign': presigned });
    const putFile: PutFile = async () => new Response(null, { status: 403 });
    await expect(createUploadsApi(client, putFile).upload('listing', file)).rejects.toMatchObject({
      code: ApiErrorCode.UploadIncomplete,
    });
    expect(calls).toHaveLength(1);
  });

  it('reports an upload the server rejected', async () => {
    const { client } = fakeClient({
      '/uploads/presign': presigned,
      [`/uploads/${UPLOAD_ID}/complete`]: { ...ready, status: 'rejected', url: null },
    });
    const putFile: PutFile = async () => new Response(null, { status: 200 });
    await expect(createUploadsApi(client, putFile).upload('listing', file)).rejects.toMatchObject({
      code: ApiErrorCode.UploadRejected,
    });
  });
});
