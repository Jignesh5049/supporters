-- CreateEnum
CREATE TYPE "post_type" AS ENUM ('product', 'service', 'update', 'offer', 'testimonial');

-- CreateEnum
CREATE TYPE "post_status" AS ENUM ('draft', 'published', 'archived');

-- CreateTable
CREATE TABLE "posts" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "business_id" UUID NOT NULL,
    "type" "post_type" NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "offer_tag" TEXT,
    "offer_ends_at" TIMESTAMPTZ(6),
    "product_id" UUID,
    "service_id" UUID,
    "status" "post_status" NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMPTZ(6),
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "save_count" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_media" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "post_id" UUID NOT NULL,
    "upload_id" UUID NOT NULL,
    "position" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "post_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_posts_business_id_status_id" ON "posts"("business_id", "status", "id");

-- CreateIndex
CREATE INDEX "idx_posts_business_id_published_at_id" ON "posts"("business_id", "published_at", "id");

-- CreateIndex
CREATE INDEX "idx_posts_published_published_at_id" ON "posts"("published_at", "id") WHERE (published_at IS NOT NULL AND deleted_at IS NULL);

-- CreateIndex
CREATE INDEX "idx_posts_product_id" ON "posts"("product_id") WHERE (product_id IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_posts_service_id" ON "posts"("service_id") WHERE (service_id IS NOT NULL);

-- CreateIndex
CREATE UNIQUE INDEX "uq_post_media_upload_id" ON "post_media"("upload_id");

-- CreateIndex
CREATE INDEX "idx_post_media_post_id_position" ON "post_media"("post_id", "position");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Hand-written: integrity checks Prisma cannot express in the schema.
ALTER TABLE "posts" ADD CONSTRAINT "ck_posts_one_listing" CHECK (num_nonnulls("product_id", "service_id") <= 1);
ALTER TABLE "posts" ADD CONSTRAINT "ck_posts_counters" CHECK ("like_count" >= 0 AND "comment_count" >= 0 AND "save_count" >= 0);
ALTER TABLE "posts" ADD CONSTRAINT "ck_posts_published_at" CHECK ("status" = 'draft' OR "published_at" IS NOT NULL);
