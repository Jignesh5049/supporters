import { GetObjectCommand, PutObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/** Where invoice PDFs live: the private bucket, under `invoices/` (never served from `public/`). */
export const INVOICE_PREFIX = 'invoices/';
/** How long a download link works. */
export const INVOICE_LINK_TTL_SEC = 300;

export interface InvoiceStore {
  put(key: string, body: Buffer): Promise<void>;
  /** A short-lived GET link that downloads the PDF under `filename`. */
  signedUrl(key: string, filename: string, ttlSec: number): Promise<string>;
}

export class S3InvoiceStore implements InvoiceStore {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
  ) {}

  async put(key: string, body: Buffer) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: 'application/pdf',
        ContentDisposition: 'attachment',
      }),
    );
  }

  signedUrl(key: string, filename: string, ttlSec: number) {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentType: 'application/pdf',
        ResponseContentDisposition: `attachment; filename="${filename.replace(/[^\w.-]/g, '_')}"`,
      }),
      { expiresIn: ttlSec },
    );
  }
}
