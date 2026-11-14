-- CreateEnum
CREATE TYPE "subscription_status" AS ENUM ('created', 'active', 'past_due', 'ended');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('captured', 'failed', 'refund_pending', 'refunded');

-- CreateEnum
CREATE TYPE "webhook_event_status" AS ENUM ('received', 'processed', 'ignored', 'failed');

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "business_id" UUID NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "provider_subscription_id" TEXT NOT NULL,
    "status" "subscription_status" NOT NULL DEFAULT 'created',
    "ended_reason" TEXT,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "cancelled_at" TIMESTAMPTZ(6),
    "current_period_start" TIMESTAMPTZ(6),
    "current_period_end" TIMESTAMPTZ(6),
    "grace_ends_at" TIMESTAMPTZ(6),
    "last_charge_event_at" TIMESTAMPTZ(6),
    "reminder_sent_for_end" TIMESTAMPTZ(6),
    "amount_paise" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "buyer_gstin" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "subscription_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "provider_payment_id" TEXT NOT NULL,
    "status" "payment_status" NOT NULL,
    "amount_paise" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "is_first" BOOLEAN NOT NULL DEFAULT false,
    "failure_code" TEXT,
    "captured_at" TIMESTAMPTZ(6),
    "refund_requested_at" TIMESTAMPTZ(6),
    "provider_refund_id" TEXT,
    "refunded_at" TIMESTAMPTZ(6),
    "refunded_by_admin_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "payment_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "financial_year" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "issued_at" TIMESTAMPTZ(6) NOT NULL,
    "details" JSONB NOT NULL,
    "total_paise" BIGINT NOT NULL,
    "taxable_paise" BIGINT NOT NULL,
    "tax_paise" BIGINT NOT NULL,
    "pdf_key" TEXT,
    "pdf_generated_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_sequences" (
    "financial_year" TEXT NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("financial_year")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "provider_event_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "data" JSONB NOT NULL,
    "status" "webhook_event_status" NOT NULL DEFAULT 'received',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "processed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "premium_listing_holds" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "business_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "listing_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "premium_listing_holds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_subscriptions_provider_subscription_id" ON "subscriptions"("provider_subscription_id");

-- CreateIndex
CREATE INDEX "idx_subscriptions_business_id_id" ON "subscriptions"("business_id", "id");

-- CreateIndex
CREATE INDEX "idx_subscriptions_current_period_end" ON "subscriptions"("current_period_end") WHERE (status IN ('active', 'past_due'));

-- CreateIndex
CREATE UNIQUE INDEX "uq_subscriptions_user_id_idempotency_key" ON "subscriptions"("created_by_user_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "uq_subscriptions_business_id_live" ON "subscriptions"("business_id") WHERE (status IN ('created', 'active', 'past_due'));

-- CreateIndex
CREATE UNIQUE INDEX "uq_payments_provider_payment_id" ON "payments"("provider_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_payments_provider_refund_id" ON "payments"("provider_refund_id");

-- CreateIndex
CREATE INDEX "idx_payments_subscription_id_id" ON "payments"("subscription_id", "id");

-- CreateIndex
CREATE INDEX "idx_payments_business_id_id" ON "payments"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_invoices_payment_id" ON "invoices"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_invoices_number" ON "invoices"("number");

-- CreateIndex
CREATE INDEX "idx_invoices_business_id_id" ON "invoices"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_invoices_financial_year_sequence" ON "invoices"("financial_year", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "uq_webhook_events_provider_event_id" ON "webhook_events"("provider_event_id");

-- CreateIndex
CREATE INDEX "idx_webhook_events_created_at" ON "webhook_events"("created_at");

-- CreateIndex
CREATE INDEX "idx_premium_listing_holds_business_id" ON "premium_listing_holds"("business_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_premium_listing_holds_kind_listing_id" ON "premium_listing_holds"("kind", "listing_id");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "premium_listing_holds" ADD CONSTRAINT "premium_listing_holds_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Invariants Prisma can't express.
ALTER TABLE "subscriptions" ADD CONSTRAINT "ck_subscriptions_amount_paise" CHECK ("amount_paise" > 0);
ALTER TABLE "payments" ADD CONSTRAINT "ck_payments_amount_paise" CHECK ("amount_paise" > 0);
ALTER TABLE "invoices" ADD CONSTRAINT "ck_invoices_amounts" CHECK ("total_paise" > 0 AND "taxable_paise" > 0 AND "tax_paise" >= 0 AND "taxable_paise" + "tax_paise" = "total_paise");
ALTER TABLE "invoice_sequences" ADD CONSTRAINT "ck_invoice_sequences_last_value" CHECK ("last_value" >= 0);
