import { Injectable, Logger } from '@nestjs/common';
import { Prisma, ProductPublicationStatus, VendorMembershipStatus } from '@prisma/client';
import slugify from 'slugify';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VendorProvisioningService {
  private readonly logger = new Logger(VendorProvisioningService.name);

  constructor(private readonly prisma: PrismaService) {}

  async provisionUserIfEligible(userId: number) {
    const request = await this.prisma.vendorOnboardingRequest.findUnique({
      where: { userId },
      include: {
        user: { include: { roles: { include: { role: true } } } },
      },
    });

    // If request exists, the application itself must be approved
    if (request) {
      if (request.applicationStatus !== 'APPROVED') {
        return null;
      }

      let membershipStatus = request.membershipStatus;
      if (membershipStatus === VendorMembershipStatus.PENDING) {
        const setting = await this.prisma.vendorMembershipSetting.findUnique({ where: { id: 1 } });
        const isFree =
          !setting?.isEnabled ||
          !setting.feeAmount ||
          Boolean(setting.freeUntil && setting.freeUntil >= new Date());
        if (isFree) {
          await this.prisma.vendorOnboardingRequest.update({
            where: { id: request.id },
            data: { membershipStatus: VendorMembershipStatus.EXEMPT, membershipAmount: 0 },
          });
          membershipStatus = VendorMembershipStatus.EXEMPT;
        } else {
          return null;
        }
      }

      if (
        membershipStatus !== VendorMembershipStatus.PAID &&
        membershipStatus !== VendorMembershipStatus.EXEMPT
      ) {
        return null;
      }
    } else {
      // If no onboarding request, check if user has role VENDOR
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { roles: { include: { role: true } } },
      });
      const hasVendorRole = user?.roles.some((r) => r.role.name === 'VENDOR');
      if (!hasVendorRole) return null;
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Ensure VENDOR role
      const vendorRole = await tx.role.findUnique({
        where: { name: 'VENDOR' },
        select: { id: true },
      });
      if (vendorRole) {
        await tx.usersOnRoles.upsert({
          where: { userId_roleId: { userId, roleId: vendorRole.id } },
          update: {},
          create: { userId, roleId: vendorRole.id },
        });
      }

      // 2. Ensure Store exists
      let store = await tx.store.findFirst({ where: { ownerId: userId } });
      if (!store) {
        const ownerUser = await tx.user.findUnique({
          where: { id: userId },
          select: { fullName: true, phoneNumber: true },
        });
        const fallbackName = ownerUser?.fullName || `فروشگاه کاربر ${userId}`;
        const storeName = request?.businessName?.trim() || fallbackName;

        let storeSlug = request?.businessSlug?.trim();
        if (!storeSlug) {
          storeSlug = slugify(storeName, {
            lower: true,
            strict: true,
            locale: 'fa',
          });
        }
        if (!storeSlug) {
          storeSlug = `store-${userId}`;
        }

        const existingStoreWithSlug = await tx.store.findUnique({
          where: { slug: storeSlug },
          select: { id: true },
        });
        if (existingStoreWithSlug) {
          storeSlug = `${storeSlug}-${userId}`;
        }

        store = await tx.store.create({
          data: {
            name: storeName,
            slug: storeSlug,
            description: request?.businessDescription ?? null,
            address: request?.businessAddress ?? null,
            lat: request?.businessLat ?? null,
            lng: request?.businessLng ?? null,
            ownerId: userId,
            isVerified: false,
            isActive: true,
          },
        });
      } else if (!store.isActive) {
        store = await tx.store.update({
          where: { id: store.id },
          data: { isActive: true },
        });
      }

      // 3. Ensure StoreWallet exists
      await tx.storeWallet.upsert({
        where: { storeId: store.id },
        update: {},
        create: {
          storeId: store.id,
          currentBalance: 0,
          availableBalance: 0,
          heldBalance: 0,
        },
      });

      // 4. Ensure initial product exists in Product table if approved and has name
      if (request?.productStatus === 'APPROVED' && request?.productName?.trim()) {
        const existingProduct = await tx.product.findFirst({
          where: { storeId: store.id },
          select: { id: true },
        });

        if (!existingProduct) {
          // Resolve category
          let categoryId = request.productCategoryId;
          if (categoryId) {
            const cat = await tx.category.findUnique({ where: { id: categoryId } });
            if (!cat) categoryId = null as any;
          }
          if (!categoryId) {
            const defaultCategory = await tx.category.findFirst({ select: { id: true } });
            categoryId = defaultCategory?.id ?? 1;
          }

          // Resolve productType
          let productTypeId = request.productTypeId;
          if (productTypeId) {
            const pt = await tx.productType.findUnique({ where: { id: productTypeId } });
            if (!pt) productTypeId = null as any;
          }
          if (!productTypeId) {
            const defaultType = await tx.productType.findFirst({ select: { id: true } });
            productTypeId = defaultType?.id ?? 1;
          }

          let productSlug = slugify(request.productName.trim(), {
            lower: true,
            strict: true,
            locale: 'fa',
          });
          if (!productSlug) {
            productSlug = `prod-${Date.now()}`;
          }
          productSlug = `${productSlug}-${store.id}`;

          const existingSlug = await tx.product.findUnique({
            where: { slug: productSlug },
            select: { id: true },
          });
          if (existingSlug) {
            productSlug = `${productSlug}-${Date.now().toString().slice(-4)}`;
          }

          await tx.product.create({
            data: {
              name: request.productName.trim(),
              slug: productSlug,
              description: request.productDescription?.trim() || null,
              price: Number(request.productPrice ?? 0),
              quantity: request.productQuantity ?? 10,
              mainImage: request.productMainImage || '/images/placeholder-flower.jpg',
              images: (request.documents as Prisma.InputJsonValue) ?? undefined,
              publicationStatus: ProductPublicationStatus.APPROVED,
              isPurchasable: true,
              isArchived: false,
              approvedAt: new Date(),
              publishedAt: new Date(),
              storeId: store.id,
              categoryId: categoryId,
              productTypeId: productTypeId,
            },
          });
        }
      }

      // 5. Update onboarding request storeActivatedAt
      if (request && !request.storeActivatedAt) {
        await tx.vendorOnboardingRequest.update({
          where: { id: request.id },
          data: { storeActivatedAt: new Date() },
        });
      }

      return store;
    });
  }

  async repairApprovedVendorsWithoutStores() {
    const [approvedRequests, vendorUsers] = await Promise.all([
      this.prisma.vendorOnboardingRequest.findMany({
        where: { applicationStatus: 'APPROVED' },
        select: { userId: true },
      }),
      this.prisma.user.findMany({
        where: { roles: { some: { role: { name: 'VENDOR' } } } },
        select: { id: true },
      }),
    ]);

    const userIds = Array.from(
      new Set([...approvedRequests.map((r) => r.userId), ...vendorUsers.map((u) => u.id)]),
    );

    const results: Array<{ userId: number; success: boolean }> = [];
    for (const userId of userIds) {
      try {
        const store = await this.provisionUserIfEligible(userId);
        results.push({ userId, success: Boolean(store) });
      } catch (err: any) {
        this.logger.error(`Failed to repair vendor ${userId}: ${err.message}`);
        results.push({ userId, success: false });
      }
    }
    return results;
  }
}
