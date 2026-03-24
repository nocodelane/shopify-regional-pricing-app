-- AlterTable
ALTER TABLE "ProductRegionRule" ADD COLUMN "productHandle" TEXT;

-- CreateTable
CREATE TABLE "PincodeRange" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "start" INTEGER NOT NULL,
    "end" INTEGER NOT NULL,
    "regionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PincodeRange_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RegionalComponent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "defaultSettings" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RegionalComponentOverride" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "componentId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "settings" TEXT NOT NULL DEFAULT '{}',
    CONSTRAINT "RegionalComponentOverride_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RegionalComponentOverride_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "RegionalComponent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CollectionRegionRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "collectionHandle" TEXT,
    "regionId" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CollectionRegionRule_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TagRegionRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TagRegionRule_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ModalConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL DEFAULT '#000000',
    "backgroundColor" TEXT NOT NULL DEFAULT '#ffffff',
    "textColor" TEXT NOT NULL DEFAULT '#333333',
    "fontSize" TEXT NOT NULL DEFAULT '16px',
    "fontFamily" TEXT NOT NULL DEFAULT 'Inter, sans-serif',
    "headerImage" TEXT,
    "title" TEXT NOT NULL DEFAULT 'Enter your Pincode',
    "description" TEXT NOT NULL DEFAULT 'Please provide your pincode to see accurate regional pricing and availability.',
    "confirmButtonText" TEXT NOT NULL DEFAULT 'Confirm',
    "showFloatingButton" BOOLEAN NOT NULL DEFAULT true,
    "floatingButtonText" TEXT NOT NULL DEFAULT 'Change Pincode',
    "position" TEXT NOT NULL DEFAULT 'bottom-right',
    "injectionSelector" TEXT,
    "showCurrentPincode" BOOLEAN NOT NULL DEFAULT true,
    "pincodePrefixText" TEXT NOT NULL DEFAULT 'Delivering to: ',
    "showLocationIcon" BOOLEAN NOT NULL DEFAULT true,
    "triggerBackgroundColor" TEXT NOT NULL DEFAULT '#000000',
    "triggerTextColor" TEXT NOT NULL DEFAULT '#ffffff',
    "triggerIconColor" TEXT NOT NULL DEFAULT '#ffffff',
    "triggerBorderRadius" TEXT NOT NULL DEFAULT '4px',
    "triggerTransparent" BOOLEAN NOT NULL DEFAULT false,
    "triggerPadding" TEXT NOT NULL DEFAULT '10px 18px',
    "triggerFontSize" TEXT NOT NULL DEFAULT '14px',
    "triggerFontWeight" TEXT NOT NULL DEFAULT '600',
    "triggerLayoutStyle" TEXT NOT NULL DEFAULT 'boxed',
    "triggerIconSize" TEXT NOT NULL DEFAULT '18px',
    "triggerBorderWidth" TEXT NOT NULL DEFAULT '1px',
    "triggerBorderColor" TEXT NOT NULL DEFAULT '#000000',
    "usePulse" BOOLEAN NOT NULL DEFAULT false,
    "useGlassmorphism" BOOLEAN NOT NULL DEFAULT false,
    "showOnAnyPage" BOOLEAN NOT NULL DEFAULT true,
    "disableScroll" BOOLEAN NOT NULL DEFAULT true,
    "overlayColor" TEXT NOT NULL DEFAULT 'rgba(0,0,0,0.6)',
    "overlayBlur" TEXT NOT NULL DEFAULT '8px',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CollectionProductHandle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "productHandle" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProductCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "collections" TEXT NOT NULL DEFAULT '[]',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LLMConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "modelId" TEXT DEFAULT 'gpt-4o',
    "baseUrl" TEXT,
    "apiKeyEncrypted" TEXT,
    "encryptionIV" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "allowSalesData" BOOLEAN NOT NULL DEFAULT false,
    "allowPincodeData" BOOLEAN NOT NULL DEFAULT true,
    "allowCustomerData" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AppConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "regionalPricingActive" BOOLEAN NOT NULL DEFAULT true,
    "visibilityRulesActive" BOOLEAN NOT NULL DEFAULT true,
    "waitlistActive" BOOLEAN NOT NULL DEFAULT true,
    "aiFeaturesActive" BOOLEAN NOT NULL DEFAULT false,
    "flashSalesActive" BOOLEAN NOT NULL DEFAULT true,
    "pincodeGuardActive" BOOLEAN NOT NULL DEFAULT false,
    "abTestingActive" BOOLEAN NOT NULL DEFAULT false,
    "allowAbsurdPricing" BOOLEAN NOT NULL DEFAULT false,
    "lockoutMessage" TEXT DEFAULT 'We don''t serve your area yet.',
    "excludedPaths" TEXT DEFAULT '/pages/contact, /pages/about',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ABTest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PRICING',
    "controlMultiplier" REAL NOT NULL DEFAULT 1.0,
    "variantMultiplier" REAL NOT NULL DEFAULT 1.1,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "config" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PincodeSearch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "matched" BOOLEAN NOT NULL DEFAULT false,
    "regionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RegionalPreset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PricingRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "collectionId" TEXT,
    "collectionHandle" TEXT,
    "productId" TEXT,
    "productHandle" TEXT,
    "startTime" DATETIME,
    "endTime" DATETIME,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PricingRule_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PricingRule" ("createdAt", "id", "regionId", "shop", "type", "updatedAt", "value") SELECT "createdAt", "id", "regionId", "shop", "type", "updatedAt", "value" FROM "PricingRule";
DROP TABLE "PricingRule";
ALTER TABLE "new_PricingRule" RENAME TO "PricingRule";
CREATE INDEX "PricingRule_shop_regionId_idx" ON "PricingRule"("shop", "regionId");
CREATE INDEX "PricingRule_collectionId_idx" ON "PricingRule"("collectionId");
CREATE TABLE "new_RegionHomepageConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "regionId" TEXT,
    "sectionsOrder" TEXT NOT NULL DEFAULT '[]',
    "hiddenSelectors" TEXT NOT NULL DEFAULT '',
    "showOnlySelectors" TEXT NOT NULL DEFAULT '',
    "placementHeight" TEXT NOT NULL DEFAULT '400px',
    "banners" TEXT NOT NULL DEFAULT '[]',
    "collections" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RegionHomepageConfig_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_RegionHomepageConfig" ("banners", "collections", "createdAt", "id", "regionId", "sectionsOrder", "shop", "updatedAt") SELECT "banners", "collections", "createdAt", "id", "regionId", "sectionsOrder", "shop", "updatedAt" FROM "RegionHomepageConfig";
DROP TABLE "RegionHomepageConfig";
ALTER TABLE "new_RegionHomepageConfig" RENAME TO "RegionHomepageConfig";
CREATE UNIQUE INDEX "RegionHomepageConfig_regionId_key" ON "RegionHomepageConfig"("regionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "PincodeRange_shop_start_end_idx" ON "PincodeRange"("shop", "start", "end");

-- CreateIndex
CREATE UNIQUE INDEX "RegionalComponentOverride_componentId_regionId_key" ON "RegionalComponentOverride"("componentId", "regionId");

-- CreateIndex
CREATE INDEX "CollectionRegionRule_collectionId_idx" ON "CollectionRegionRule"("collectionId");

-- CreateIndex
CREATE INDEX "CollectionRegionRule_shop_regionId_idx" ON "CollectionRegionRule"("shop", "regionId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionRegionRule_shop_collectionId_regionId_key" ON "CollectionRegionRule"("shop", "collectionId", "regionId");

-- CreateIndex
CREATE INDEX "TagRegionRule_shop_regionId_idx" ON "TagRegionRule"("shop", "regionId");

-- CreateIndex
CREATE UNIQUE INDEX "TagRegionRule_shop_tag_regionId_key" ON "TagRegionRule"("shop", "tag", "regionId");

-- CreateIndex
CREATE UNIQUE INDEX "ModalConfig_shop_key" ON "ModalConfig"("shop");

-- CreateIndex
CREATE INDEX "CollectionProductHandle_shop_collectionId_idx" ON "CollectionProductHandle"("shop", "collectionId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionProductHandle_collectionId_productHandle_key" ON "CollectionProductHandle"("collectionId", "productHandle");

-- CreateIndex
CREATE INDEX "ProductCache_shop_idx" ON "ProductCache"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "LLMConfig_shop_key" ON "LLMConfig"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "AppConfig_shop_key" ON "AppConfig"("shop");

-- CreateIndex
CREATE INDEX "ABTest_shop_idx" ON "ABTest"("shop");

-- CreateIndex
CREATE INDEX "PincodeSearch_shop_pincode_idx" ON "PincodeSearch"("shop", "pincode");

-- CreateIndex
CREATE INDEX "PincodeSearch_shop_createdAt_idx" ON "PincodeSearch"("shop", "createdAt");

-- CreateIndex
CREATE INDEX "WaitlistEntry_shop_pincode_idx" ON "WaitlistEntry"("shop", "pincode");

-- CreateIndex
CREATE INDEX "ProductRegionRule_shop_regionId_idx" ON "ProductRegionRule"("shop", "regionId");
