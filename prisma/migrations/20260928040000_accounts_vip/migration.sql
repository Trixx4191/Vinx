-- Session revocation, profile photos, VIP opt-in, and timed drops.
--
-- Every column is nullable or has a constant default, so this is a
-- metadata-only change on Postgres 11+: no table rewrite, no long lock, and
-- every existing row stays valid.
--
-- sessionVersion defaults to 0, which is also what a login token issued before
-- this migration is treated as carrying — so deploying this does not sign
-- anyone out. It only starts mattering the first time a version is bumped.

ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "vipOptIn" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "vipSince" TIMESTAMP(3);

-- Both null on every existing product, which means "already released" — the
-- catalog is unchanged until an admin sets a drop date.
ALTER TABLE "Product" ADD COLUMN "releaseAt" TIMESTAMP(3);
ALTER TABLE "Product" ADD COLUMN "earlyAccessAt" TIMESTAMP(3);

-- The catalog filters on releaseAt on every request.
CREATE INDEX "Product_releaseAt_idx" ON "Product"("releaseAt");
