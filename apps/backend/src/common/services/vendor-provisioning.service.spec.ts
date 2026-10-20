import { VendorMembershipStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { VendorProvisioningService } from './vendor-provisioning.service';

describe('VendorProvisioningService store activation', () => {
  const userId = 12;

  function createFixture({
    isActive = false,
    isVerified = true,
    suspendedAt = null as Date | null,
    hasRequest = true,
  } = {}) {
    const store = {
      id: 25,
      ownerId: userId,
      isActive,
      isVerified,
      suspendedAt,
      suspensionReason: suspendedAt ? 'Administrative suspension' : null,
    };
    const request = hasRequest ? {
      id: 8,
      applicationStatus: 'APPROVED',
      membershipStatus: VendorMembershipStatus.EXEMPT,
      storeActivatedAt: new Date(),
      productStatus: 'APPROVED',
      productName: 'Initial product',
    } : null;
    const transaction = {
      role: { findUnique: jest.fn().mockResolvedValue({ id: 3 }) },
      usersOnRoles: { upsert: jest.fn().mockResolvedValue({}) },
      store: {
        findFirst: jest.fn().mockResolvedValue(store),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ ...store, isVerified: true }),
      },
      storeWallet: { upsert: jest.fn().mockResolvedValue({}) },
      product: { findFirst: jest.fn().mockResolvedValue({ id: 1 }), create: jest.fn() },
    };
    const prisma = {
      vendorOnboardingRequest: { findUnique: jest.fn().mockResolvedValue(request) },
      user: {
        findUnique: jest.fn().mockResolvedValue({ roles: [{ role: { name: 'VENDOR' } }] }),
      },
      $transaction: jest.fn(async (callback: (client: typeof transaction) => unknown) => callback(transaction)),
    };
    const service = new VendorProvisioningService(prisma as unknown as PrismaService);
    return { service, transaction, store };
  }

  it.each([true, false])('preserves a suspended store with onboarding request=%s', async (hasRequest) => {
    const { service, transaction, store } = createFixture({
      suspendedAt: new Date(),
      hasRequest,
    });

    await expect(service.provisionUserIfEligible(userId)).resolves.toEqual(store);
    expect(transaction.store.update).not.toHaveBeenCalled();
    expect(transaction.store.updateMany).not.toHaveBeenCalled();
    expect(transaction.product.findFirst).not.toHaveBeenCalled();
    expect(transaction.storeWallet.upsert).toHaveBeenCalled();
  });

  it('does not reactivate legacy inactive stores without suspension metadata', async () => {
    const { service, transaction } = createFixture();

    const store = await service.provisionUserIfEligible(userId);

    expect(store?.isActive).toBe(false);
    expect(transaction.store.update).not.toHaveBeenCalled();
    expect(transaction.store.updateMany).not.toHaveBeenCalled();
  });

  it('verifies an eligible existing store without changing its activity', async () => {
    const { service, transaction } = createFixture({ isVerified: false });

    const store = await service.provisionUserIfEligible(userId);

    expect(store?.isActive).toBe(false);
    expect(store?.isVerified).toBe(true);
    expect(transaction.store.updateMany).toHaveBeenCalledWith({
      where: { id: 25, isVerified: false, suspendedAt: null },
      data: { isVerified: true },
    });
  });

  it('does not verify a suspended unverified store', async () => {
    const { service, transaction } = createFixture({
      isVerified: false,
      suspendedAt: new Date(),
    });

    const store = await service.provisionUserIfEligible(userId);

    expect(store?.isActive).toBe(false);
    expect(store?.isVerified).toBe(false);
    expect(transaction.store.updateMany).not.toHaveBeenCalled();
  });

  it('preserves a suspension applied while provisioning is in progress', async () => {
    const { service, transaction, store } = createFixture({
      isActive: true,
      isVerified: false,
    });
    const suspendedStore = {
      ...store,
      isActive: false,
      suspendedAt: new Date(),
      suspensionReason: 'Administrative suspension',
    };
    transaction.store.updateMany.mockResolvedValue({ count: 0 });
    transaction.store.findUniqueOrThrow.mockResolvedValue(suspendedStore);

    await expect(service.provisionUserIfEligible(userId)).resolves.toEqual(suspendedStore);
    expect(transaction.store.updateMany).toHaveBeenCalledWith({
      where: { id: 25, isVerified: false, suspendedAt: null },
      data: { isVerified: true },
    });
    expect(transaction.product.findFirst).not.toHaveBeenCalled();
  });

  it('leaves active verified stores unchanged', async () => {
    const { service, transaction } = createFixture({ isActive: true });

    const store = await service.provisionUserIfEligible(userId);

    expect(store?.isActive).toBe(true);
    expect(transaction.store.update).not.toHaveBeenCalled();
    expect(transaction.store.updateMany).not.toHaveBeenCalled();
    expect(transaction.product.findFirst).toHaveBeenCalled();
  });
});
