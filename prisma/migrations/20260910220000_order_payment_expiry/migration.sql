ALTER TABLE "Order" ADD COLUMN "paymentExpiresAt" TIMESTAMP(3);

UPDATE "Order"
SET "paymentExpiresAt" = "createdAt" + INTERVAL '30 minutes'
WHERE "status" = 'PENDING';
