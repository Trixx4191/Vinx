-- VIP reminders and early-access announcements.
ALTER TABLE "User" ADD COLUMN "vipReminderFor" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "vipDropEmails" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "vipDropNoticedTo" TIMESTAMP(3);

-- Refund webhooks look an order up by its Paystack reference.
CREATE INDEX "Order_paymentRef_idx" ON "Order"("paymentRef");
