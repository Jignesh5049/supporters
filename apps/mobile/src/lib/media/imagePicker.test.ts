import { validateDocument, MEDIA_LIMITS } from './imagePicker';

describe('Media validation (mobile spec lines 136-138)', () => {
  it('enforces maximum limits matching the specification', () => {
    expect(MEDIA_LIMITS.maxVideoDurationSec).toBe(60);
    expect(MEDIA_LIMITS.maxVideoSizeBytes).toBe(100 * 1024 * 1024);
    expect(MEDIA_LIMITS.maxDocSizeBytes).toBe(10 * 1024 * 1024);
  });

  it('accepts valid PDF documents under 10 MB', () => {
    const result = validateDocument({
      name: 'gst_certificate.pdf',
      sizeBytes: 2 * 1024 * 1024,
      mimeType: 'application/pdf',
    });
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rejects non-PDF documents', () => {
    const result = validateDocument({
      name: 'invoice.docx',
      sizeBytes: 1024 * 1024,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Only PDF/);
  });

  it('rejects PDF documents exceeding 10 MB', () => {
    const result = validateDocument({
      name: 'large_catalog.pdf',
      sizeBytes: 12 * 1024 * 1024,
      mimeType: 'application/pdf',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/10 MB/);
  });
});
