-- On-model photography.
--
-- Two new tables and no change to any existing one, so this cannot affect a
-- live catalog: every current product simply has no rows in
-- "ProductModelShot" and keeps rendering exactly as it did.
--
-- "Model" is a small registry — three to five people the catalog is shot on.
-- The photographs themselves are produced outside this application and
-- uploaded through the admin product form, the same way front and back images
-- already are. Nothing here generates an image.

CREATE TABLE "Model" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    -- Free text rather than an enum: "Women", "Men", "Unisex" and whatever else
    -- gets shot are all equally valid, and an enum would need a migration every
    -- time that list changed.
    "gender" TEXT NOT NULL,
    -- Both nullable. A shot is still useful without measurements, just less
    -- informative — these are what let the storefront say "on Kofi, 185cm,
    -- wearing L" beside the photograph.
    "heightCm" INTEGER,
    "wearingSize" TEXT,
    "referenceImageUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    -- Models are retired, not deleted: a model who has been shot in products is
    -- referenced by those shots, and removing the row would take the imagery
    -- with it.
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Model_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductModelShot" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductModelShot_pkey" PRIMARY KEY ("id")
);

-- One shot per model per product. A second angle on the same model belongs in
-- the product's gallery images; a duplicate pairing here would make "which
-- model is this product shown on" ambiguous.
CREATE UNIQUE INDEX "ProductModelShot_productId_modelId_key" ON "ProductModelShot"("productId", "modelId");

-- The storefront reads these by product on every detail page view.
CREATE INDEX "ProductModelShot_productId_idx" ON "ProductModelShot"("productId");

-- Deleting a product takes its model shots with it: the shot is a photograph of
-- that specific garment and means nothing without it.
ALTER TABLE "ProductModelShot" ADD CONSTRAINT "ProductModelShot_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Deliberately RESTRICT, not CASCADE. Deleting a model must not silently erase
-- every photograph they appear in across the catalog; the admin retires them
-- with "isActive" instead, and a delete is refused while shots still reference
-- them.
ALTER TABLE "ProductModelShot" ADD CONSTRAINT "ProductModelShot_modelId_fkey"
    FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
