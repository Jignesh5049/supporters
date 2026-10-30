import {
  BucketAlreadyOwnedByYou,
  CreateBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import { loadEnv } from '../src/config/env';
import { createS3Client } from '../src/modules/uploads/storage';

/**
 * Local development only: creates the media bucket in MinIO and lets anyone
 * read public/ (what CloudFront does for media.<domain> in AWS). chat/ and
 * kyc/ stay private.
 */
const env = loadEnv();
if (!env.S3_ENDPOINT) throw new Error('storage:init is for local MinIO (S3_ENDPOINT unset)');

const s3 = createS3Client(env);
try {
  await s3.send(new CreateBucketCommand({ Bucket: env.S3_BUCKET }));
} catch (error) {
  if (!(error instanceof BucketAlreadyOwnedByYou)) throw error;
}
await s3.send(
  new PutBucketPolicyCommand({
    Bucket: env.S3_BUCKET,
    Policy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${env.S3_BUCKET}/public/*`],
        },
      ],
    }),
  }),
);
s3.destroy();
process.stdout.write(`Bucket ${env.S3_BUCKET} is ready; public/ is readable.\n`);
