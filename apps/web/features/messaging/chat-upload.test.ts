import { describe, expect, it, vi } from 'vitest';
import { UploadError, type UploadDeps } from '@/features/business/upload';
import { pickChatFiles, uploadChatFiles } from './chat-upload';

const file = (name: string, type: string, size = 4) =>
  new File([new Uint8Array(size)], name, { type });
const photo = (n = 1) => file(`photo-${n}.jpg`, 'image/jpeg');
const pdf = (size = 4) => file('quote.pdf', 'application/pdf', size);

const ID = (n: number) => `4b0c4c55-3f6d-4b1f-9a51-2b2c0f3c9a${String(n).padStart(2, '0')}`;

function deps() {
  let n = 0;
  const request = vi.fn((path: string, options?: { body?: { contentType: string } }) => {
    if (path.endsWith('/complete')) {
      const id = path.split('/')[3];
      return Promise.resolve({
        id,
        purpose: 'chat',
        status: 'ready',
        contentType: 'image/jpeg',
        size: 4,
        url: null,
      });
    }
    n += 1;
    return Promise.resolve({
      id: ID(n),
      url: `http://localhost:59000/supporters-media/chat/${n}?sig=x`,
      method: 'PUT',
      headers: { 'content-type': options?.body?.contentType ?? '' },
      expiresAt: '2026-11-04T10:05:00.000Z',
    });
  }) as unknown as UploadDeps['request'];
  const put = vi.fn<typeof fetch>(() => Promise.resolve(new Response(null, { status: 200 })));
  return { request, put };
}

describe('pickChatFiles', () => {
  it('takes 1 to 5 photos, or exactly one PDF', () => {
    expect(pickChatFiles([photo(1), photo(2)]).type).toBe('image');
    expect(pickChatFiles([pdf()]).type).toBe('file');
    expect(() => pickChatFiles([1, 2, 3, 4, 5, 6].map(photo))).toThrow('up to 5 photos');
    expect(() => pickChatFiles([pdf(), photo()])).toThrow('one PDF at a time');
    expect(() => pickChatFiles([file('a.gif', 'image/gif')])).toThrow(UploadError);
    expect(() => pickChatFiles([])).toThrow(UploadError);
  });
});

describe('uploadChatFiles', () => {
  it('presigns each file with purpose chat and returns the upload ids, with no public URL needed', async () => {
    const d = deps();
    await expect(uploadChatFiles(pickChatFiles([photo(1), photo(2)]), d)).resolves.toEqual([
      ID(1),
      ID(2),
    ]);
    expect(d.request).toHaveBeenCalledWith('/v1/uploads/presign', {
      method: 'POST',
      body: { purpose: 'chat', contentType: 'image/jpeg', size: 4 },
    });
    expect(d.put).toHaveBeenCalledTimes(2);
    expect(d.put.mock.calls[0]?.[1]).toMatchObject({ credentials: 'omit' });
  });

  it('refuses a PDF over 10 MB before uploading anything', async () => {
    const d = deps();
    await expect(uploadChatFiles(pickChatFiles([pdf(11 * 1024 * 1024)]), d)).rejects.toThrow(
      'under 10 MB',
    );
    expect(d.request).not.toHaveBeenCalled();
  });
});
