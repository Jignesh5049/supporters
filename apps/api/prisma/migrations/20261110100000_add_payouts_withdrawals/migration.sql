-- CreateEnum
CREATE TYPE "payout_method" AS ENUM ('upi', 'bank');

-- CreateEnum
CREATE TYPE "payout_validation_status" AS ENUM ('pending', 'validated', 'failed');

-- CreateEnum
CREATE TYPE "withdrawal_status" AS ENUM ('pending', 'processing', 'completed', 'rejected', 'failed');

-- AlterTable
ALTER TABLE "wallet_ledger" ADD COLUMN     "withdrawal_id" UUID;

-- CreateTable
CREATE TABLE "payout_accounts" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "method" "payout_method" NOT NULL,
    "holder_name" TEXT NOT NULL,
    "registered_name" TEXT,
    "destination_enc" BYTEA NOT NULL,
    "destination_hash" TEXT NOT NULL,
    "masked_destination" TEXT NOT NULL,
    "validation_status" "payout_validation_status" NOT NULL DEFAULT 'pending',
    "is_name_match" BOOLEAN NOT NULL,
    "provider_fund_account_id" TEXT,
    "provider_validation_id" TEXT,
    "superseded_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payout_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawals" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "payout_account_id" UUID NOT NULL,
    "amount_paise" BIGINT NOT NULL,
    "status" "withdrawal_status" NOT NULL DEFAULT 'pending',
    "idempotency_key" TEXT NOT NULL,
    "is_name_mismatch" BOOLEAN NOT NULL DEFAULT false,
    "rejection_reason" TEXT,
    "failure_reason" TEXT,
    "reviewed_by_user_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "payout_idempotency_key" TEXT,
    "provider_payout_id" TEXT,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_payout_accounts_user_id_id" ON "payout_accounts"("user_id", "id");

-- CreateIndex
CREATE INDEX "idx_payout_accounts_provider_validation_id" ON "payout_accounts"("provider_validation_id");

-- CreateIndex
CREATE INDEX "idx_withdrawals_user_id_id" ON "withdrawals"("user_id", "id");

-- CreateIndex
CREATE INDEX "idx_withdrawals_status_id" ON "withdrawals"("status", "id");

-- CreateIndex
CREATE INDEX "idx_withdrawals_provider_payout_id" ON "withdrawals"("provider_payout_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_withdrawals_user_id_idempotency_key" ON "withdrawals"("user_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "idx_wallet_ledger_withdrawal_id" ON "wallet_ledger"("withdrawal_id");

-- AddForeignKey
ALTER TABLE "wallet_ledger" ADD CONSTRAINT "wallet_ledger_withdrawal_id_fkey" FOREIGN KEY ("withdrawal_id") REFERENCES "withdrawals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_accounts" ADD CONSTRAINT "payout_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_payout_account_id_fkey" FOREIGN KEY ("payout_account_id") REFERENCES "payout_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- At most one payout request in flight per user, and one live version of the payout details.
CREATE UNIQUE INDEX "uq_withdrawals_one_open_per_user" ON "withdrawals"("user_id")
  WHERE status IN ('pending', 'processing');
CREATE UNIQUE INDEX "uq_payout_accounts_one_live_per_user" ON "payout_accounts"("user_id")
  WHERE superseded_at IS NULL;
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_amount_positive" CHECK (amount_paise > 0);

-- A payout destination is never edited in place: a change is a new row (so a withdrawal keeps the
-- details it was requested against). Only the validation outcome and the superseded mark may change.
CREATE FUNCTION "payout_accounts_immutable_destination"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.method IS DISTINCT FROM OLD.method
     OR NEW.holder_name IS DISTINCT FROM OLD.holder_name
     OR NEW.destination_enc IS DISTINCT FROM OLD.destination_enc
     OR NEW.destination_hash IS DISTINCT FROM OLD.destination_hash
     OR NEW.masked_destination IS DISTINCT FROM OLD.masked_destination THEN
    RAISE EXCEPTION 'payout destinations are immutable: add a new version';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "payout_accounts_no_destination_update"
  BEFORE UPDATE ON "payout_accounts"
  FOR EACH ROW EXECUTE FUNCTION "payout_accounts_immutable_destination"();
