-- Product media: optional hover video + extra gallery images.
--
-- Both columns are additive and safe to run against a live table:
--   * "hoverVideoUrl" is nullable, so existing rows need no backfill.
--   * "galleryImages" has a constant default, which Postgres 11+ applies as a
--     metadata-only change rather than rewriting every row.
-- Neither takes a long-lived exclusive lock on a populated products table.

ALTER TABLE "Product" ADD COLUMN "hoverVideoUrl" TEXT;
ALTER TABLE "Product" ADD COLUMN "galleryImages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
