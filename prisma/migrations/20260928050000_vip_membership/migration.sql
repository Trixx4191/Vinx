-- VIP becomes a paid membership.
--
-- The previous migration gave VIP a free opt-in flag. VIP is now a paid,
-- time-bound membership, so the flag is replaced by a paid-through date. Any
-- free opt-ins recorded in the meantime were never paid for and are dropped
-- with the column rather than silently converted into paid time.

ALTER TABLE "User" DROP COLUMN "vipOptIn";
ALTER TABLE "User" ADD COLUMN "vipUntil" TIMESTAMP(3);
-- vipSince meant "opted in at"; it now means "member continuously since". The
-- old values described free opt-ins, so they are cleared too.
UPDATE "User" SET "vipSince" = NULL;

CREATE TABLE "VipPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "periodDays" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentRef" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "VipPurchase_pkey" PRIMARY KEY ("id")
);

-- A Paystack reference can pay for exactly one purchase.
CREATE UNIQUE INDEX "VipPurchase_paymentRef_key" ON "VipPurchase"("paymentRef");
CREATE INDEX "VipPurchase_userId_createdAt_idx" ON "VipPurchase"("userId", "createdAt");

ALTER TABLE "VipPurchase" ADD CONSTRAINT "VipPurchase_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
