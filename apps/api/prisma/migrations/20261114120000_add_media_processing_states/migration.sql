-- The media job (backend spec, Queues): pending -> processing -> ready | failed.
-- `rejected` stays for rows that were rejected before this migration; nothing writes it any more.
ALTER TYPE "upload_status" ADD VALUE IF NOT EXISTS 'processing';
ALTER TYPE "upload_status" ADD VALUE IF NOT EXISTS 'failed';

-- AlterTable
ALTER TABLE "uploads" ADD COLUMN "failure_reason" TEXT;
