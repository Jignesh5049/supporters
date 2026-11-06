-- CreateEnum
CREATE TYPE "requirement_status" AS ENUM ('open', 'closed', 'fulfilled', 'expired');

-- AlterEnum
ALTER TYPE "message_type" ADD VALUE 'quote';

-- AlterEnum
ALTER TYPE "upload_purpose" ADD VALUE 'requirement';

-- CreateTable
CREATE TABLE "buyer_requirements" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "delivery_city_id" UUID NOT NULL,
    "budget_paise" BIGINT,
    "status" "requirement_status" NOT NULL DEFAULT 'open',
    "quote_count" INTEGER NOT NULL DEFAULT 0,
    "matched_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "closed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "buyer_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirement_images" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "requirement_id" UUID NOT NULL,
    "upload_id" UUID NOT NULL,
    "position" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "requirement_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirement_matches" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "requirement_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "rank" INTEGER NOT NULL,
    "notified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "requirement_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirement_quotes" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "requirement_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "price_paise" BIGINT NOT NULL,
    "message" TEXT NOT NULL,
    "product_id" UUID,
    "service_id" UUID,
    "conversation_id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "requirement_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_buyer_requirements_category_id_delivery_city_id_status" ON "buyer_requirements"("category_id", "delivery_city_id", "status");

-- CreateIndex
CREATE INDEX "idx_buyer_requirements_user_id_status_id" ON "buyer_requirements"("user_id", "status", "id");

-- CreateIndex
CREATE INDEX "idx_buyer_requirements_status_expires_at" ON "buyer_requirements"("status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_requirement_images_upload_id" ON "requirement_images"("upload_id");

-- CreateIndex
CREATE INDEX "idx_requirement_images_requirement_id_position" ON "requirement_images"("requirement_id", "position");

-- CreateIndex
CREATE INDEX "idx_requirement_matches_business_id_requirement_id" ON "requirement_matches"("business_id", "requirement_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_requirement_matches_requirement_id_business_id" ON "requirement_matches"("requirement_id", "business_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_requirement_quotes_message_id" ON "requirement_quotes"("message_id");

-- CreateIndex
CREATE INDEX "idx_requirement_quotes_requirement_id_id" ON "requirement_quotes"("requirement_id", "id");

-- CreateIndex
CREATE INDEX "idx_requirement_quotes_business_id_created_at" ON "requirement_quotes"("business_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_requirement_quotes_conversation_id" ON "requirement_quotes"("conversation_id");

-- CreateIndex
CREATE INDEX "idx_requirement_quotes_product_id" ON "requirement_quotes"("product_id") WHERE (product_id IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_requirement_quotes_service_id" ON "requirement_quotes"("service_id") WHERE (service_id IS NOT NULL);

-- CreateIndex
CREATE UNIQUE INDEX "uq_requirement_quotes_requirement_id_business_id" ON "requirement_quotes"("requirement_id", "business_id");

-- AddForeignKey
ALTER TABLE "buyer_requirements" ADD CONSTRAINT "buyer_requirements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_requirements" ADD CONSTRAINT "buyer_requirements_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_requirements" ADD CONSTRAINT "buyer_requirements_delivery_city_id_fkey" FOREIGN KEY ("delivery_city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_images" ADD CONSTRAINT "requirement_images_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "buyer_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_images" ADD CONSTRAINT "requirement_images_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_matches" ADD CONSTRAINT "requirement_matches_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "buyer_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_matches" ADD CONSTRAINT "requirement_matches_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_quotes" ADD CONSTRAINT "requirement_quotes_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "buyer_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_quotes" ADD CONSTRAINT "requirement_quotes_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_quotes" ADD CONSTRAINT "requirement_quotes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_quotes" ADD CONSTRAINT "requirement_quotes_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_quotes" ADD CONSTRAINT "requirement_quotes_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_quotes" ADD CONSTRAINT "requirement_quotes_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Invariants Prisma can't express.
ALTER TABLE "buyer_requirements" ADD CONSTRAINT "ck_buyer_requirements_quantity" CHECK ("quantity" > 0);
ALTER TABLE "buyer_requirements" ADD CONSTRAINT "ck_buyer_requirements_budget" CHECK ("budget_paise" IS NULL OR "budget_paise" > 0);
ALTER TABLE "buyer_requirements" ADD CONSTRAINT "ck_buyer_requirements_quote_count" CHECK ("quote_count" >= 0);
ALTER TABLE "requirement_quotes" ADD CONSTRAINT "ck_requirement_quotes_price" CHECK ("price_paise" > 0);
-- A quote attaches at most one listing.
ALTER TABLE "requirement_quotes" ADD CONSTRAINT "ck_requirement_quotes_one_listing" CHECK (num_nonnulls("product_id", "service_id") <= 1);
