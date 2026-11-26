-- AlterTable
ALTER TABLE "withdrawals" ADD COLUMN     "payout_attempted_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "razorpayx_webhook_events" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "processed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "razorpayx_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_razorpayx_webhook_events_event_id" ON "razorpayx_webhook_events"("event_id");

-- CreateIndex
CREATE INDEX "idx_razorpayx_webhook_events_created_at" ON "razorpayx_webhook_events"("created_at");
