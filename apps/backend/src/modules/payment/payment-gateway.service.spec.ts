import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentGatewayRegistryService } from './payment-gateway-registry.service';
import { PaymentGatewayService } from './payment-gateway.service';

describe('checkout gateway selection', () => {
  const gateway = { id: 1, key: 'zarinpal-main', driver: 'zarinpal', isActive: true, isDefault: true, sandboxMode: false };
  const prisma = {
    paymentGatewayConfig: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  const registry = { supports: jest.fn().mockReturnValue(true) };
  const service = new PaymentGatewayService(prisma as unknown as PrismaService, registry as unknown as PaymentGatewayRegistryService);

  beforeEach(() => {
    prisma.paymentGatewayConfig.findFirst.mockReset();
    prisma.paymentGatewayConfig.findUnique.mockReset();
  });

  it('selects the active default gateway without forcing a sandbox key', async () => {
    prisma.paymentGatewayConfig.findFirst.mockResolvedValue(gateway);
    expect(await service.resolveGatewaySelection({})).toEqual(gateway);
    expect(prisma.paymentGatewayConfig.findFirst).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: [{ isDefault: 'desc' }, { priority: 'asc' }, { id: 'asc' }],
    });
    expect(prisma.paymentGatewayConfig.findUnique).not.toHaveBeenCalled();
  });

  it('keeps explicit gateway selection available to administrative callers', async () => {
    prisma.paymentGatewayConfig.findUnique.mockResolvedValue(gateway);
    expect(await service.resolveGatewaySelection({ gatewayKey: gateway.key })).toEqual(gateway);
    expect(prisma.paymentGatewayConfig.findUnique).toHaveBeenCalledWith({ where: { key: gateway.key } });
  });

  it('rejects an inactive gateway', async () => {
    prisma.paymentGatewayConfig.findUnique.mockResolvedValue({ ...gateway, isActive: false });
    await expect(service.resolveGatewaySelection({ gatewayKey: gateway.key })).rejects.toThrow(BadRequestException);
  });
});
