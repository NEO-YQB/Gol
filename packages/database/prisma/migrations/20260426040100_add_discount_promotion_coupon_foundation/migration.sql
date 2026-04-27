-- CreateEnum
CREATE TYPE "DiscountValueType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');
CREATE TYPE "DiscountLayer" AS ENUM ('VENDOR', 'PLATFORM', 'COUPON');
CREATE TYPE "PromotionScopeType" AS ENUM ('PRODUCT', 'STORE', 'CATEGORY');
CREATE TYPE "CouponApplyOn" AS ENUM ('BASE_SUBTOTAL', 'DISCOUNTED_SUBTOTAL');

-- CreateTable
CREATE TABLE "VendorDiscount" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "storeId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "valueType" "DiscountValueType" NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isExclusive" BOOLEAN NOT NULL DEFAULT false,
    "allowCouponStacking" BOOLEAN NOT NULL DEFAULT false,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VendorDiscount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformPromotion" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "layer" "DiscountLayer" NOT NULL DEFAULT 'PLATFORM',
    "valueType" "DiscountValueType" NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isExclusive" BOOLEAN NOT NULL DEFAULT false,
    "allowVendorDiscountStacking" BOOLEAN NOT NULL DEFAULT false,
    "allowCouponStacking" BOOLEAN NOT NULL DEFAULT false,
    "promotedVisibility" BOOLEAN NOT NULL DEFAULT false,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "createdByUserId" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlatformPromotion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PromotionOnProducts" (
    "promotionId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    CONSTRAINT "PromotionOnProducts_pkey" PRIMARY KEY ("promotionId","productId")
);

CREATE TABLE "PromotionOnStores" (
    "promotionId" INTEGER NOT NULL,
    "storeId" INTEGER NOT NULL,
    CONSTRAINT "PromotionOnStores_pkey" PRIMARY KEY ("promotionId","storeId")
);

CREATE TABLE "PromotionOnCategories" (
    "promotionId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    CONSTRAINT "PromotionOnCategories_pkey" PRIMARY KEY ("promotionId","categoryId")
);

CREATE TABLE "Coupon" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "layer" "DiscountLayer" NOT NULL DEFAULT 'COUPON',
    "valueType" "DiscountValueType" NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isExclusive" BOOLEAN NOT NULL DEFAULT true,
    "applyOn" "CouponApplyOn" NOT NULL DEFAULT 'DISCOUNTED_SUBTOTAL',
    "firstOrderOnly" BOOLEAN NOT NULL DEFAULT false,
    "minOrderAmount" DECIMAL(12,2),
    "usageLimit" INTEGER,
    "perUserUsageLimit" INTEGER,
    "allowVendorDiscountStacking" BOOLEAN NOT NULL DEFAULT false,
    "allowPlatformPromotionStacking" BOOLEAN NOT NULL DEFAULT false,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "createdByUserId" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CouponRedemption" (
    "id" SERIAL NOT NULL,
    "couponId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "orderId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CouponOnProducts" (
    "couponId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    CONSTRAINT "CouponOnProducts_pkey" PRIMARY KEY ("couponId","productId")
);

CREATE TABLE "CouponOnStores" (
    "couponId" INTEGER NOT NULL,
    "storeId" INTEGER NOT NULL,
    CONSTRAINT "CouponOnStores_pkey" PRIMARY KEY ("couponId","storeId")
);

CREATE TABLE "CouponOnCategories" (
    "couponId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    CONSTRAINT "CouponOnCategories_pkey" PRIMARY KEY ("couponId","categoryId")
);

-- Indexes
CREATE INDEX "VendorDiscount_productId_isActive_idx" ON "VendorDiscount"("productId", "isActive");
CREATE INDEX "VendorDiscount_storeId_isActive_idx" ON "VendorDiscount"("storeId", "isActive");
CREATE INDEX "PlatformPromotion_isActive_priority_idx" ON "PlatformPromotion"("isActive", "priority");
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");
CREATE INDEX "Coupon_isActive_priority_idx" ON "Coupon"("isActive", "priority");
CREATE INDEX "CouponRedemption_couponId_userId_idx" ON "CouponRedemption"("couponId", "userId");
CREATE UNIQUE INDEX "CouponRedemption_orderId_key" ON "CouponRedemption"("orderId");

-- Foreign keys
ALTER TABLE "VendorDiscount" ADD CONSTRAINT "VendorDiscount_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorDiscount" ADD CONSTRAINT "VendorDiscount_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromotionOnProducts" ADD CONSTRAINT "PromotionOnProducts_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "PlatformPromotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromotionOnProducts" ADD CONSTRAINT "PromotionOnProducts_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromotionOnStores" ADD CONSTRAINT "PromotionOnStores_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "PlatformPromotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromotionOnStores" ADD CONSTRAINT "PromotionOnStores_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromotionOnCategories" ADD CONSTRAINT "PromotionOnCategories_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "PlatformPromotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromotionOnCategories" ADD CONSTRAINT "PromotionOnCategories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponOnProducts" ADD CONSTRAINT "CouponOnProducts_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponOnProducts" ADD CONSTRAINT "CouponOnProducts_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponOnStores" ADD CONSTRAINT "CouponOnStores_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponOnStores" ADD CONSTRAINT "CouponOnStores_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponOnCategories" ADD CONSTRAINT "CouponOnCategories_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponOnCategories" ADD CONSTRAINT "CouponOnCategories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
