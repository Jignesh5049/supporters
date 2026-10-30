-- CreateEnum
CREATE TYPE "business_type" AS ENUM ('manufacturer', 'wholesaler', 'retailer', 'distributor', 'brand', 'service_provider');

-- CreateEnum
CREATE TYPE "verification_status" AS ENUM ('none', 'pending', 'verified', 'rejected');

-- CreateTable
CREATE TABLE "states" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "state_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "parent_id" UUID,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businesses" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "owner_user_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "business_type" NOT NULL,
    "category_id" UUID NOT NULL,
    "subcategory_id" UUID,
    "city_id" UUID NOT NULL,
    "state_id" UUID NOT NULL,
    "gstin" TEXT,
    "about" TEXT,
    "established_year" SMALLINT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "website" TEXT,
    "contact_person" TEXT,
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "is_contact_public" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT,
    "pincode" TEXT,
    "map_url" TEXT,
    "socials" JSONB NOT NULL DEFAULT '{}',
    "opening_hours" JSONB NOT NULL DEFAULT '[]',
    "verification_status" "verification_status" NOT NULL DEFAULT 'none',
    "verified_at" TIMESTAMPTZ(6),
    "premium_until" TIMESTAMPTZ(6),
    "profile_completion" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_states_code" ON "states"("code");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cities_state_id_name" ON "cities"("state_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "uq_categories_slug" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "idx_categories_parent_id_position" ON "categories"("parent_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "uq_businesses_owner_user_id" ON "businesses"("owner_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_businesses_slug" ON "businesses"("slug");

-- CreateIndex
CREATE INDEX "idx_businesses_category_id" ON "businesses"("category_id");

-- CreateIndex
CREATE INDEX "idx_businesses_subcategory_id" ON "businesses"("subcategory_id");

-- CreateIndex
CREATE INDEX "idx_businesses_city_id" ON "businesses"("city_id");

-- CreateIndex
CREATE INDEX "idx_businesses_state_id" ON "businesses"("state_id");

-- CreateIndex
CREATE INDEX "idx_user_interests_category_id" ON "user_interests"("category_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cities" ADD CONSTRAINT "cities_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
