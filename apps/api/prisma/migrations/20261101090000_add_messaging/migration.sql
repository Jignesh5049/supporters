-- CreateEnum
CREATE TYPE "chat_side" AS ENUM ('user', 'business');

-- CreateEnum
CREATE TYPE "message_type" AS ENUM ('text', 'image', 'file', 'listing_card', 'enquiry');

-- CreateEnum
CREATE TYPE "enquiry_status" AS ENUM ('new', 'responded', 'closed');

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "last_message_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_state" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "conversation_id" UUID NOT NULL,
    "side" "chat_side" NOT NULL,
    "last_read_message_id" UUID,
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "conversation_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "conversation_id" UUID NOT NULL,
    "sender_user_id" UUID NOT NULL,
    "sender_side" "chat_side" NOT NULL,
    "client_id" UUID NOT NULL,
    "request_hash" TEXT NOT NULL,
    "type" "message_type" NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "product_id" UUID,
    "service_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_attachments" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "message_id" UUID NOT NULL,
    "upload_id" UUID NOT NULL,
    "position" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_hidden" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "message_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "message_hidden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enquiries" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "product_id" UUID,
    "service_id" UUID,
    "quantity" INTEGER,
    "unit" TEXT,
    "delivery_city_id" UUID,
    "message" TEXT NOT NULL,
    "share_phone" BOOLEAN NOT NULL DEFAULT false,
    "status" "enquiry_status" NOT NULL DEFAULT 'new',
    "first_response_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "enquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocks" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "blocker_id" UUID NOT NULL,
    "blocked_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_conversations_user_id_last_message_at_id" ON "conversations"("user_id", "last_message_at", "id");

-- CreateIndex
CREATE INDEX "idx_conversations_business_id_last_message_at_id" ON "conversations"("business_id", "last_message_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_conversations_user_id_business_id" ON "conversations"("user_id", "business_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_conversation_state_conversation_id_side" ON "conversation_state"("conversation_id", "side");

-- CreateIndex
CREATE INDEX "idx_messages_conversation_id_id" ON "messages"("conversation_id", "id");

-- CreateIndex
CREATE INDEX "idx_messages_product_id" ON "messages"("product_id") WHERE (product_id IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_messages_service_id" ON "messages"("service_id") WHERE (service_id IS NOT NULL);

-- CreateIndex
CREATE UNIQUE INDEX "uq_messages_sender_user_id_client_id" ON "messages"("sender_user_id", "client_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_message_attachments_upload_id" ON "message_attachments"("upload_id");

-- CreateIndex
CREATE INDEX "idx_message_attachments_message_id_position" ON "message_attachments"("message_id", "position");

-- CreateIndex
CREATE INDEX "idx_message_hidden_user_id" ON "message_hidden"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_message_hidden_message_id_user_id" ON "message_hidden"("message_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_enquiries_message_id" ON "enquiries"("message_id");

-- CreateIndex
CREATE INDEX "idx_enquiries_user_id_id" ON "enquiries"("user_id", "id");

-- CreateIndex
CREATE INDEX "idx_enquiries_business_id_status_id" ON "enquiries"("business_id", "status", "id");

-- CreateIndex
CREATE INDEX "idx_enquiries_conversation_id_status" ON "enquiries"("conversation_id", "status");

-- CreateIndex
CREATE INDEX "idx_enquiries_product_id_created_at" ON "enquiries"("product_id", "created_at") WHERE (product_id IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_enquiries_service_id_created_at" ON "enquiries"("service_id", "created_at") WHERE (service_id IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_blocks_blocked_id" ON "blocks"("blocked_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_blocks_blocker_id_blocked_id" ON "blocks"("blocker_id", "blocked_id");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_state" ADD CONSTRAINT "conversation_state_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_hidden" ADD CONSTRAINT "message_hidden_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_hidden" ADD CONSTRAINT "message_hidden_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_delivery_city_id_fkey" FOREIGN KEY ("delivery_city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- A message points at no more than one listing, and an enquiry asks for a positive quantity.
ALTER TABLE "messages" ADD CONSTRAINT "ck_messages_one_listing" CHECK (product_id IS NULL OR service_id IS NULL);
ALTER TABLE "enquiries" ADD CONSTRAINT "ck_enquiries_one_listing" CHECK (product_id IS NULL OR service_id IS NULL);
ALTER TABLE "enquiries" ADD CONSTRAINT "ck_enquiries_quantity_positive" CHECK (quantity IS NULL OR quantity > 0);
-- Nobody blocks themselves.
ALTER TABLE "blocks" ADD CONSTRAINT "ck_blocks_not_self" CHECK (blocker_id <> blocked_id);
