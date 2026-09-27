-- The swatch colour for a variant, as #rrggbb.
--
-- Nullable on purpose: every existing variant stays valid and keeps rendering,
-- because the storefront falls back to matching the colour name against a
-- lookup table when this is unset. That fallback is a guess at what "Sand"
-- looks like; this column is the answer.
--
-- Adding a nullable column is a metadata-only change in Postgres, so this does
-- not rewrite the table or hold a long lock.

ALTER TABLE "ProductVariant" ADD COLUMN "colorHex" TEXT;
