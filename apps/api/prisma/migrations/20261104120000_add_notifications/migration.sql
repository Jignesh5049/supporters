-- CreateEnum
CREATE TYPE "notification_category" AS ENUM ('messages', 'enquiries', 'business', 'referrals', 'subscription', 'account');

-- CreateEnum
CREATE TYPE "notification_channel" AS ENUM ('push', 'email');

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "category" "notification_category" NOT NULL,
    "actor_user_id" UUID,
    "actor_count" INTEGER NOT NULL DEFAULT 1,
    "target_type" TEXT NOT NULL,
    "target_id" UUID,
    "group_key" TEXT,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_prefs" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "category" "notification_category" NOT NULL,
    "channel" "notification_channel" NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notification_prefs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_tokens" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" "device_platform" NOT NULL,
    "last_used_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "web_push_subscriptions" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "last_used_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "web_push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "published_at" TIMESTAMPTZ(6),
    "processed_at" TIMESTAMPTZ(6),
    "fanout" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_notifications_user_id_id" ON "notifications"("user_id", "id");

-- CreateIndex
CREATE INDEX "idx_notifications_user_id_category_id" ON "notifications"("user_id", "category", "id");

-- CreateIndex
CREATE INDEX "idx_notifications_user_id_unread" ON "notifications"("user_id") WHERE (read_at IS NULL);

-- CreateIndex
CREATE INDEX "idx_notifications_user_id_group_key_created_at" ON "notifications"("user_id", "group_key", "created_at") WHERE (group_key IS NOT NULL AND read_at IS NULL);

-- CreateIndex
CREATE INDEX "idx_notifications_actor_user_id" ON "notifications"("actor_user_id");

-- CreateIndex
CREATE INDEX "idx_notifications_created_at" ON "notifications"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_notification_prefs_user_id_category_channel" ON "notification_prefs"("user_id", "category", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "uq_push_tokens_token" ON "push_tokens"("token");

-- CreateIndex
CREATE INDEX "idx_push_tokens_user_id_id" ON "push_tokens"("user_id", "id");

-- CreateIndex
CREATE INDEX "idx_push_tokens_session_id" ON "push_tokens"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_web_push_subscriptions_endpoint" ON "web_push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "idx_web_push_subscriptions_user_id_id" ON "web_push_subscriptions"("user_id", "id");

-- CreateIndex
CREATE INDEX "idx_web_push_subscriptions_session_id" ON "web_push_subscriptions"("session_id");

-- CreateIndex
CREATE INDEX "idx_outbox_events_unpublished" ON "outbox_events"("id") WHERE (published_at IS NULL);

-- CreateIndex
CREATE INDEX "idx_outbox_events_processed_at" ON "outbox_events"("processed_at") WHERE (processed_at IS NOT NULL);

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_prefs" ADD CONSTRAINT "notification_prefs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "web_push_subscriptions" ADD CONSTRAINT "web_push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "web_push_subscriptions" ADD CONSTRAINT "web_push_subscriptions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

