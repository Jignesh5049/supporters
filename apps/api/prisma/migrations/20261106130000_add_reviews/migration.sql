-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "rating_avg" DECIMAL(2,1),
ADD COLUMN     "rating_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "business_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rating" SMALLINT NOT NULL,
    "body" TEXT NOT NULL,
    "owner_reply" TEXT,
    "owner_replied_at" TIMESTAMPTZ(6),
    "hidden_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_reviews_business_id_id" ON "reviews"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_reviews_user_id_business_id" ON "reviews"("user_id", "business_id");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Invariants Prisma can't express.
ALTER TABLE "reviews" ADD CONSTRAINT "ck_reviews_rating" CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "businesses" ADD CONSTRAINT "ck_businesses_rating_count" CHECK ("rating_count" >= 0);
