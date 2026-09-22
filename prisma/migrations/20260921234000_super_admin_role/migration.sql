-- Add SUPER_ADMIN to the Role enum.
--
-- Additive only: no existing row changes, and every current ADMIN keeps
-- exactly the rights it had. The first SUPER_ADMIN is created deliberately,
-- via `npm run create-admin -- --super`, rather than by promoting anyone here
-- — a migration should not hand out privileges on its own.
--
-- The new value is deliberately not referenced anywhere else in this file:
-- Postgres only permits ALTER TYPE ... ADD VALUE inside a transaction (which
-- is how Prisma runs migrations) when the value isn't used in that same
-- transaction. Assigning it here would fail on apply.

ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
