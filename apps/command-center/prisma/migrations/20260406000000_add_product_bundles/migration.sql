CREATE TABLE IF NOT EXISTS "ProductBundle" (
  id TEXT PRIMARY KEY,
  "parentProductId" TEXT UNIQUE NOT NULL REFERENCES "Product"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ProductBundle_parentProductId_idx" ON "ProductBundle"("parentProductId");
CREATE INDEX IF NOT EXISTS "ProductBundle_isActive_idx" ON "ProductBundle"("isActive");

CREATE TABLE IF NOT EXISTS "ProductBundleComponent" (
  id TEXT PRIMARY KEY,
  "bundleId" TEXT NOT NULL REFERENCES "ProductBundle"(id) ON DELETE CASCADE,
  "productId" TEXT NOT NULL REFERENCES "Product"(id),
  quantity INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("bundleId", "productId")
);
CREATE INDEX IF NOT EXISTS "ProductBundleComponent_bundleId_idx" ON "ProductBundleComponent"("bundleId");
CREATE INDEX IF NOT EXISTS "ProductBundleComponent_productId_idx" ON "ProductBundleComponent"("productId");
