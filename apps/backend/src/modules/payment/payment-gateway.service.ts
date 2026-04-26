import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentGatewayConfig, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentGatewayConfigDto } from './dto/create-payment-gateway-config.dto';
import { UpdatePaymentGatewayConfigDto } from './dto/update-payment-gateway-config.dto';
import { PaymentGatewayRegistryService } from './payment-gateway-registry.service';

type AuthenticatedUser = {
  id: number;
  roles: string[];
};

@Injectable()
export class PaymentGatewayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentGatewayRegistry: PaymentGatewayRegistryService,
  ) {}

  async listActiveOptions() {
    const gateways = await this.prisma.paymentGatewayConfig.findMany({
      where: { isActive: true },
      orderBy: [{ isDefault: 'desc' }, { priority: 'asc' }, { id: 'asc' }],
    });

    return gateways.map((gateway) => this.toPublicGateway(gateway));
  }

  async adminList(user: AuthenticatedUser) {
    this.assertAdmin(user);

    return this.prisma.paymentGatewayConfig.findMany({
      orderBy: [{ isDefault: 'desc' }, { priority: 'asc' }, { id: 'asc' }],
    });
  }

  async adminCreate(user: AuthenticatedUser, dto: CreatePaymentGatewayConfigDto) {
    this.assertAdmin(user);
    this.ensureDriverPresent(dto.driver);

    const existing = await this.prisma.paymentGatewayConfig.findUnique({
      where: { key: dto.key },
    });
    if (existing) {
      throw new ConflictException('gateway config با این key از قبل وجود دارد');
    }

    if (dto.isDefault && dto.isActive === false) {
      throw new BadRequestException('gateway پیش فرض باید active باشد');
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.paymentGatewayConfig.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.paymentGatewayConfig.create({
        data: {
          key: dto.key,
          displayName: dto.displayName,
          driver: dto.driver.toLowerCase(),
          isActive: dto.isActive ?? true,
          isDefault: dto.isDefault ?? false,
          priority: dto.priority ?? 100,
          sandboxMode: dto.sandboxMode ?? true,
          merchantConfig: this.toInputJson(dto.merchantConfig),
          technicalConfig: this.toInputJson(dto.technicalConfig),
          callbackUrl: dto.callbackUrl,
          returnUrl: dto.returnUrl,
          notes: dto.notes,
          metadata: this.toInputJson(dto.metadata),
        },
      });
    });
  }

  async adminUpdate(
    user: AuthenticatedUser,
    id: number,
    dto: UpdatePaymentGatewayConfigDto,
  ) {
    this.assertAdmin(user);

    const gateway = await this.getGatewayOrThrow(id);
    if (dto.driver) {
      this.ensureDriverPresent(dto.driver);
    }

    const nextIsDefault = dto.isDefault ?? gateway.isDefault;
    const nextIsActive = dto.isActive ?? gateway.isActive;
    if (nextIsDefault && !nextIsActive) {
      throw new BadRequestException('gateway پیش فرض باید active باشد');
    }

    return this.prisma.$transaction(async (tx) => {
      if (nextIsDefault) {
        await tx.paymentGatewayConfig.updateMany({
          where: { isDefault: true, NOT: { id } },
          data: { isDefault: false },
        });
      }

      return tx.paymentGatewayConfig.update({
        where: { id },
        data: {
          key: dto.key ?? gateway.key,
          displayName: dto.displayName ?? gateway.displayName,
          driver: dto.driver?.toLowerCase() ?? gateway.driver,
          isActive: nextIsActive,
          isDefault: nextIsDefault,
          priority: dto.priority ?? gateway.priority,
          sandboxMode: dto.sandboxMode ?? gateway.sandboxMode,
          merchantConfig: dto.merchantConfig !== undefined
            ? this.toInputJson(dto.merchantConfig)
            : this.toNullableInputJson(gateway.merchantConfig),
          technicalConfig: dto.technicalConfig !== undefined
            ? this.toInputJson(dto.technicalConfig)
            : this.toNullableInputJson(gateway.technicalConfig),
          callbackUrl: dto.callbackUrl ?? gateway.callbackUrl,
          returnUrl: dto.returnUrl ?? gateway.returnUrl,
          notes: dto.notes ?? gateway.notes,
          metadata: dto.metadata !== undefined
            ? this.toInputJson(dto.metadata)
            : this.toNullableInputJson(gateway.metadata),
        },
      });
    });
  }

  async resolveGatewaySelection(input: {
    gatewayConfigId?: number;
    gatewayKey?: string;
  }) {
    if (input.gatewayConfigId && input.gatewayKey) {
      throw new BadRequestException('فقط یکی از gatewayConfigId یا gatewayKey را ارسال کن');
    }

    let gateway: PaymentGatewayConfig | null = null;

    if (input.gatewayConfigId) {
      gateway = await this.prisma.paymentGatewayConfig.findUnique({
        where: { id: input.gatewayConfigId },
      });
    } else if (input.gatewayKey) {
      gateway = await this.prisma.paymentGatewayConfig.findUnique({
        where: { key: input.gatewayKey },
      });
    } else {
      gateway = await this.prisma.paymentGatewayConfig.findFirst({
        where: { isActive: true },
        orderBy: [{ isDefault: 'desc' }, { priority: 'asc' }, { id: 'asc' }],
      });
    }

    if (!gateway) {
      throw new NotFoundException('gateway config مناسب برای پرداخت پیدا نشد');
    }

    if (!gateway.isActive) {
      throw new BadRequestException('gateway انتخاب‌شده فعال نیست');
    }

    this.ensureDriverPresent(gateway.driver);

    return gateway;
  }

  private async getGatewayOrThrow(id: number) {
    const gateway = await this.prisma.paymentGatewayConfig.findUnique({
      where: { id },
    });

    if (!gateway) {
      throw new NotFoundException('gateway config مورد نظر یافت نشد');
    }

    return gateway;
  }

  private toPublicGateway(gateway: PaymentGatewayConfig) {
    return {
      id: gateway.id,
      key: gateway.key,
      displayName: gateway.displayName,
      driver: gateway.driver,
      isDefault: gateway.isDefault,
      priority: gateway.priority,
      sandboxMode: gateway.sandboxMode,
      callbackUrl: gateway.callbackUrl,
      returnUrl: gateway.returnUrl,
    };
  }

  private ensureDriverPresent(driver: string) {
    if (!this.paymentGatewayRegistry.supports(driver)) {
      throw new BadRequestException(
        'در حال حاضر adapter این driver در backend پیاده‌سازی نشده است',
      );
    }
  }

  private assertAdmin(user: AuthenticatedUser) {
    if (!user.roles.includes('ADMIN')) {
      throw new ForbiddenException('این endpoint فقط برای ادمین مجاز است');
    }
  }

  private toInputJson(value: Record<string, unknown> | undefined) {
    if (value === undefined) {
      return undefined;
    }

    return value as Prisma.InputJsonValue;
  }

  private toNullableInputJson(value: Prisma.JsonValue | null) {
    if (value === null) {
      return Prisma.JsonNull;
    }

    return value as Prisma.InputJsonValue;
  }
}
