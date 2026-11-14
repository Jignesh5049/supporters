-- CreateEnum
CREATE TYPE "verification_method" AS ENUM ('gstin', 'udyam');

-- CreateEnum
CREATE TYPE "verification_request_status" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "verification_document_kind" AS ENUM ('certificate', 'owner_id');

-- CreateEnum
CREATE TYPE "report_target_type" AS ENUM ('post', 'comment', 'review', 'message', 'business', 'requirement');

-- CreateEnum
CREATE TYPE "report_reason" AS ENUM ('spam', 'fraud', 'offensive', 'wrong_category', 'other');

-- CreateEnum
CREATE TYPE "report_status" AS ENUM ('open', 'actioned', 'dismissed');

-- CreateEnum
CREATE TYPE "report_action" AS ENUM ('dismiss', 'hide', 'warn', 'suspend');

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "hidden_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "hidden_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "hidden_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "hidden_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "business_verifications" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "business_id" UUID NOT NULL,
    "method" "verification_method" NOT NULL,
    "registration_number" TEXT NOT NULL,
    "status" "verification_request_status" NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,
    "reviewed_by_user_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "business_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_documents" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "verification_id" UUID NOT NULL,
    "upload_id" UUID NOT NULL,
    "kind" "verification_document_kind" NOT NULL,
    "position" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "verification_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "reporter_user_id" UUID NOT NULL,
    "target_type" "report_target_type" NOT NULL,
    "target_id" UUID NOT NULL,
    "subject_user_id" UUID NOT NULL,
    "reason" "report_reason" NOT NULL,
    "details" TEXT,
    "status" "report_status" NOT NULL DEFAULT 'open',
    "action" "report_action",
    "resolution_note" TEXT,
    "resolved_by_user_id" UUID,
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "actor_user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_business_verifications_business_id_id" ON "business_verifications"("business_id", "id");

-- CreateIndex
CREATE INDEX "idx_business_verifications_status_id" ON "business_verifications"("status", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_business_verifications_business_id_pending" ON "business_verifications"("business_id") WHERE (status = 'pending');

-- CreateIndex
CREATE UNIQUE INDEX "uq_verification_documents_upload_id" ON "verification_documents"("upload_id");

-- CreateIndex
CREATE INDEX "idx_verification_documents_verification_id_position" ON "verification_documents"("verification_id", "position");

-- CreateIndex
CREATE INDEX "idx_reports_status_id" ON "reports"("status", "id");

-- CreateIndex
CREATE INDEX "idx_reports_target_type_target_id_status" ON "reports"("target_type", "target_id", "status");

-- CreateIndex
CREATE INDEX "idx_reports_subject_user_id" ON "reports"("subject_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_reports_reporter_user_id_target_type_target_id" ON "reports"("reporter_user_id", "target_type", "target_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_actor_user_id_id" ON "audit_logs"("actor_user_id", "id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_target_type_target_id_id" ON "audit_logs"("target_type", "target_id", "id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_action_id" ON "audit_logs"("action", "id");

-- AddForeignKey
ALTER TABLE "business_verifications" ADD CONSTRAINT "business_verifications_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_verifications" ADD CONSTRAINT "business_verifications_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_documents" ADD CONSTRAINT "verification_documents_verification_id_fkey" FOREIGN KEY ("verification_id") REFERENCES "business_verifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_documents" ADD CONSTRAINT "verification_documents_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "uploads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_user_id_fkey" FOREIGN KEY ("reporter_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolved_by_user_id_fkey" FOREIGN KEY ("resolved_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Audit logs are append-only: no UPDATE or DELETE, even from the application role.
CREATE FUNCTION "audit_logs_append_only"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$;

CREATE TRIGGER "audit_logs_no_update_or_delete"
  BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION "audit_logs_append_only"();
