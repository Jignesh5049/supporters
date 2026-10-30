-- CreateEnum
CREATE TYPE "upload_purpose" AS ENUM ('avatar', 'cover', 'listing', 'post', 'chat', 'kyc');

-- CreateEnum
CREATE TYPE "upload_status" AS ENUM ('pending', 'ready', 'rejected');

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "cover_upload_id" UUID,
ADD COLUMN     "logo_upload_id" UUID;

-- CreateTable
CREATE TABLE "uploads" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "purpose" "upload_purpose" NOT NULL,
    "key" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "status" "upload_status" NOT NULL DEFAULT 'pending',
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_media" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "upload_id" UUID NOT NULL,
    "product_id" UUID,
    "service_id" UUID,
    "position" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "listing_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_uploads_key" ON "uploads"("key");

-- CreateIndex
CREATE INDEX "idx_uploads_user_id_created_at" ON "uploads"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_uploads_status_created_at" ON "uploads"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_listing_media_upload_id" ON "listing_media"("upload_id");

-- CreateIndex
CREATE INDEX "idx_listing_media_product_id_position" ON "listing_media"("product_id", "position");

-- CreateIndex
CREATE INDEX "idx_listing_media_service_id_position" ON "listing_media"("service_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "uq_businesses_logo_upload_id" ON "businesses"("logo_upload_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_businesses_cover_upload_id" ON "businesses"("cover_upload_id");

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_logo_upload_id_fkey" FOREIGN KEY ("logo_upload_id") REFERENCES "uploads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_cover_upload_id_fkey" FOREIGN KEY ("cover_upload_id") REFERENCES "uploads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_media" ADD CONSTRAINT "listing_media_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_media" ADD CONSTRAINT "listing_media_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_media" ADD CONSTRAINT "listing_media_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- A media row belongs to exactly one listing (Prisma can't express CHECK constraints).
ALTER TABLE "listing_media" ADD CONSTRAINT "ck_listing_media_one_listing" CHECK (num_nonnulls("product_id", "service_id") = 1);
