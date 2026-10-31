-- CreateEnum
CREATE TYPE "save_target_type" AS ENUM ('post', 'product', 'service', 'business');

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "follower_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "post_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "parent_id" UUID,
    "body" TEXT NOT NULL,
    "reply_count" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "likes" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saves" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "target_type" "save_target_type" NOT NULL,
    "target_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "saves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_seen" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "feed_seen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_comments_post_id_parent_id_id" ON "comments"("post_id", "parent_id", "id");

-- CreateIndex
CREATE INDEX "idx_comments_parent_id_id" ON "comments"("parent_id", "id") WHERE (parent_id IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_comments_user_id" ON "comments"("user_id");

-- CreateIndex
CREATE INDEX "idx_likes_post_id" ON "likes"("post_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_likes_user_id_post_id" ON "likes"("user_id", "post_id");

-- CreateIndex
CREATE INDEX "idx_saves_user_id_id" ON "saves"("user_id", "id");

-- CreateIndex
CREATE INDEX "idx_saves_user_id_target_type_id" ON "saves"("user_id", "target_type", "id");

-- CreateIndex
CREATE INDEX "idx_saves_target_type_target_id" ON "saves"("target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_saves_user_id_target_type_target_id" ON "saves"("user_id", "target_type", "target_id");

-- CreateIndex
CREATE INDEX "idx_follows_user_id_id" ON "follows"("user_id", "id");

-- CreateIndex
CREATE INDEX "idx_follows_business_id_id" ON "follows"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_follows_user_id_business_id" ON "follows"("user_id", "business_id");

-- CreateIndex
CREATE INDEX "idx_feed_seen_post_id" ON "feed_seen"("post_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_feed_seen_user_id_post_id" ON "feed_seen"("user_id", "post_id");

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saves" ADD CONSTRAINT "saves_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_seen" ADD CONSTRAINT "feed_seen_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_seen" ADD CONSTRAINT "feed_seen_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Hand-written: integrity checks Prisma cannot express in the schema.
ALTER TABLE "businesses" ADD CONSTRAINT "ck_businesses_follower_count" CHECK ("follower_count" >= 0);
ALTER TABLE "comments" ADD CONSTRAINT "ck_comments_reply_count" CHECK ("reply_count" >= 0);
ALTER TABLE "comments" ADD CONSTRAINT "ck_comments_not_own_parent" CHECK ("parent_id" IS NULL OR "parent_id" <> "id");
