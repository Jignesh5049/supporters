/** MinIO for tests: the same image and credentials as docker-compose.yml. */
export const MINIO_IMAGE =
  'cgr.dev/chainguard/minio@sha256:3b6e40c30ecd5cea627e382ff0b82ca841f58c52294578787043ee80c8ef7c82';
export const MINIO_CREDENTIALS = {
  accessKeyId: 'minio-local',
  secretAccessKey: 'minio-local-secret',
};
export const TEST_BUCKET = 'supporters-media-test';
