-- Storefront settings editable from the admin without a deploy.
--
-- A new table, no change to any existing one. Empty until an admin saves a
-- value; the storefront treats a missing row as "not set".

CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);
