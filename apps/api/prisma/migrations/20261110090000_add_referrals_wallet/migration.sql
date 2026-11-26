-- CreateEnum
CREATE TYPE "referral_status" AS ENUM ('pending', 'successful', 'ineligible', 'failed');

-- CreateEnum
CREATE TYPE "ledger_entry_type" AS ENUM ('referral_reward', 'bonus', 'reversal', 'withdrawal');

-- CreateTable
CREATE TABLE "referral_codes" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "referrer_user_id" UUID NOT NULL,
    "referred_user_id" UUID NOT NULL,
    "status" "referral_status" NOT NULL DEFAULT 'pending',
    "reason" TEXT NOT NULL,
    "phone_hash" TEXT NOT NULL,
    "signup_ip_hash" TEXT,
    "device_key_hash" TEXT,
    "attestation_passed" BOOLEAN,
    "business_id" UUID,
    "payment_id" UUID,
    "premium_activated_at" TIMESTAMPTZ(6),
    "eligible_at" TIMESTAMPTZ(6),
    "reward_paise" BIGINT,
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_ledger" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "type" "ledger_entry_type" NOT NULL,
    "amount_paise" BIGINT NOT NULL,
    "entry_key" TEXT NOT NULL,
    "referral_id" UUID,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_referral_codes_user_id" ON "referral_codes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_referral_codes_code" ON "referral_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "uq_referrals_referred_user_id" ON "referrals"("referred_user_id");

-- CreateIndex
CREATE INDEX "idx_referrals_referrer_user_id_id" ON "referrals"("referrer_user_id", "id");

-- CreateIndex
CREATE INDEX "idx_referrals_phone_hash" ON "referrals"("phone_hash");

-- CreateIndex
CREATE INDEX "idx_referrals_device_key_hash" ON "referrals"("device_key_hash");

-- CreateIndex
CREATE INDEX "idx_referrals_pending_eligible_at" ON "referrals"("eligible_at") WHERE (status = 'pending' AND eligible_at IS NOT NULL);

-- CreateIndex
CREATE UNIQUE INDEX "uq_wallets_user_id" ON "wallets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_wallet_ledger_entry_key" ON "wallet_ledger"("entry_key");

-- CreateIndex
CREATE INDEX "idx_wallet_ledger_user_id_id" ON "wallet_ledger"("user_id", "id");

-- AddForeignKey
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_user_id_fkey" FOREIGN KEY ("referrer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_user_id_fkey" FOREIGN KEY ("referred_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledger" ADD CONSTRAINT "wallet_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledger" ADD CONSTRAINT "wallet_ledger_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "referrals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Ledger entries have a direction fixed by their type, and are never zero.
ALTER TABLE "wallet_ledger" ADD CONSTRAINT "wallet_ledger_amount_sign" CHECK (
  amount_paise <> 0 AND (
    (type IN ('referral_reward', 'bonus') AND amount_paise > 0) OR
    (type = 'withdrawal' AND amount_paise < 0) OR
    type = 'reversal'
  )
);

-- The ledger is append-only: no UPDATE or DELETE, even from the application role.
CREATE FUNCTION "wallet_ledger_append_only"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'wallet_ledger is append-only';
END;
$$;

CREATE TRIGGER "wallet_ledger_no_update_or_delete"
  BEFORE UPDATE OR DELETE ON "wallet_ledger"
  FOR EACH ROW EXECUTE FUNCTION "wallet_ledger_append_only"();
