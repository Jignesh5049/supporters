-- CreateEnum
CREATE TYPE "listing_status" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "product_availability" AS ENUM ('in_stock', 'made_to_order', 'bulk');

-- CreateEnum
CREATE TYPE "service_availability" AS ENUM ('immediate', 'within_24_hours', 'by_appointment');

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "business_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price_paise" BIGINT,
    "original_price_paise" BIGINT,
    "unit" TEXT,
    "moq" INTEGER,
    "availability" "product_availability" NOT NULL DEFAULT 'in_stock',
    "delivery_time" TEXT,
    "is_all_india" BOOLEAN NOT NULL DEFAULT true,
    "area_state_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "specs" JSONB NOT NULL DEFAULT '[]',
    "status" "listing_status" NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "business_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price_paise" BIGINT,
    "price_unit" TEXT,
    "turnaround" TEXT,
    "availability" "service_availability" NOT NULL DEFAULT 'by_appointment',
    "is_all_india" BOOLEAN NOT NULL DEFAULT true,
    "area_state_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "area_city_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "listing_status" NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_products_business_id_status_id" ON "products"("business_id", "status", "id");

-- CreateIndex
CREATE INDEX "idx_products_published_category_id_id" ON "products"("category_id", "id") WHERE (status = 'published' AND deleted_at IS NULL);

-- CreateIndex
CREATE INDEX "idx_services_business_id_status_id" ON "services"("business_id", "status", "id");

-- CreateIndex
CREATE INDEX "idx_services_published_category_id_id" ON "services"("category_id", "id") WHERE (status = 'published' AND deleted_at IS NULL);

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
