import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CommissionRule,
  CommissionRuleScope,
  DomainEventType,
  OrderStatus,
  Prisma,
  SettlementStatus,
  SupportTicketStatus,
  VendorHealthStatus,
  WalletTransactionDirection,
  WalletTransactionType,
} from '@prisma/client';
import { DomainEventsService } from '../../common/services/domain-events.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCommissionRuleDto } from './dto/create-commission-rule.dto';
import { UpdateCommissionRuleDto } from './dto/update-commission-rule.dto';
import { GetCommissionRulesQueryDto } from './dto/get-commission-rules-query.dto';
import { ManualWalletAdjustmentDto } from './dto/manual-wallet-adjustment.dto';

type AuthenticatedUser = {
  id: number;
  roles: string[];
};

const FINANCE_TX_OPTIONS = {
  maxWait: 10_000,
  timeout: 15_000,
} as const;

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventsService,
  ) {}

  async adminCreateCommissionRule(user: AuthenticatedUser, dto: CreateCommissionRuleDto) {
    this.assertAdmin(user);
    await this.validateCommissionRuleDto(dto);

    return this.prisma.commissionRule.create({
      data: {
        scope: dto.scope,
        storeId: dto.scope === CommissionRuleScope.STORE ? dto.storeId : null,
        title: dto.title,
        description: dto.description,
        commissionRate: dto.commissionRate,
        systemServiceFeeRate: dto.systemServiceFeeRate ?? 0,
        systemServiceFeeFixed: dto.systemServiceFeeFixed ?? 0,
        settlementHoldDays: dto.settlementHoldDays ?? 7,
        complaintWindowHours: dto.complaintWindowHours ?? 24,
        autoReleaseEnabled: dto.autoReleaseEnabled ?? true,
        priority: dto.priority ?? 100,
        isActive: dto.isActive ?? true,
        startAt: dto.startAt,
        endAt: dto.endAt,
        reason: dto.reason,
        createdByUserId: user.id,
        metadata: this.toInputJson(dto.metadata),
      },
      include: this.commissionRuleInclude(),
    });
  }

  async adminListCommissionRules(user: AuthenticatedUser, query: GetCommissionRulesQueryDto) {
    this.assertAdmin(user);
    const { page = 1, limit = 10, scope, isActive } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CommissionRuleWhereInput = {
      ...(scope ? { scope } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.commissionRule.findMany({
        where,
        skip,
        take: limit,
        include: this.commissionRuleInclude(),
        orderBy: [{ scope: 'desc' }, { priority: 'asc' }, { id: 'desc' }],
      }),
      this.prisma.commissionRule.count({ where }),
    ]);

    return {
      data: items,
      meta: { total, page, lastPage: Math.ceil(total / limit) },
    };
  }

  async adminGetCommissionRule(user: AuthenticatedUser, id: number) {
    this.assertAdmin(user);
    return this.getCommissionRuleOrThrow(id);
  }

  async adminUpdateCommissionRule(user: AuthenticatedUser, id: number, dto: UpdateCommissionRuleDto) {
    this.assertAdmin(user);
    const existing = await this.getCommissionRuleOrThrow(id);

    const nextScope = dto.scope ?? existing.scope;
    const nextStoreId = dto.storeId !== undefined ? dto.storeId : existing.storeId ?? undefined;
    await this.validateCommissionRuleDto({
      scope: nextScope,
      storeId: nextStoreId,
      title: dto.title ?? existing.title,
      description: dto.description ?? existing.description ?? undefined,
      commissionRate: dto.commissionRate ?? Number(existing.commissionRate),
      systemServiceFeeRate: dto.systemServiceFeeRate ?? Number(existing.systemServiceFeeRate),
      systemServiceFeeFixed: dto.systemServiceFeeFixed ?? Number(existing.systemServiceFeeFixed),
      settlementHoldDays: dto.settlementHoldDays ?? existing.settlementHoldDays,
      complaintWindowHours: dto.complaintWindowHours ?? existing.complaintWindowHours,
      autoReleaseEnabled: dto.autoReleaseEnabled ?? existing.autoReleaseEnabled,
      priority: dto.priority ?? existing.priority,
      isActive: dto.isActive ?? existing.isActive,
      startAt: dto.startAt ?? existing.startAt ?? undefined,
      endAt: dto.endAt ?? existing.endAt ?? undefined,
      reason: dto.reason ?? existing.reason ?? undefined,
    });

    return this.prisma.commissionRule.update({
      where: { id },
      data: {
        scope: nextScope,
        storeId: nextScope === CommissionRuleScope.STORE ? nextStoreId ?? null : null,
        title: dto.title ?? existing.title,
        description: dto.description ?? existing.description,
        commissionRate: dto.commissionRate ?? existing.commissionRate,
        systemServiceFeeRate: dto.systemServiceFeeRate ?? existing.systemServiceFeeRate,
        systemServiceFeeFixed: dto.systemServiceFeeFixed ?? existing.systemServiceFeeFixed,
        settlementHoldDays: dto.settlementHoldDays ?? existing.settlementHoldDays,
        complaintWindowHours: dto.complaintWindowHours ?? existing.complaintWindowHours,
        autoReleaseEnabled: dto.autoReleaseEnabled ?? existing.autoReleaseEnabled,
        priority: dto.priority ?? existing.priority,
        isActive: dto.isActive ?? existing.isActive,
        startAt: dto.startAt !== undefined ? dto.startAt : existing.startAt,
        endAt: dto.endAt !== undefined ? dto.endAt : existing.endAt,
        reason: dto.reason ?? existing.reason,
        metadata: dto.metadata !== undefined ? this.toInputJson(dto.metadata) : this.toNullableInputJson(existing.metadata),
      },
      include: this.commissionRuleInclude(),
    });
  }

  async adminDeleteCommissionRule(user: AuthenticatedUser, id: number) {
    this.assertAdmin(user);
    await this.getCommissionRuleOrThrow(id);
    await this.prisma.commissionRule.delete({ where: { id } });
  }

  async adminListWallets(user: AuthenticatedUser) {
    this.assertAdmin(user);
    return this.prisma.storeWallet.findMany({
      include: {
        store: {
          select: { id: true, name: true, slug: true, ownerId: true },
        },
        transactions: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async adminGetWalletByStore(user: AuthenticatedUser, storeId: number) {
    this.assertAdmin(user);
    const wallet = await this.ensureWallet(storeId);
    return this.prisma.storeWallet.findUnique({
      where: { id: wallet.id },
      include: {
        store: {
          select: { id: true, name: true, slug: true, ownerId: true },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });
  }

  async vendorGetOwnWallet(user: AuthenticatedUser) {
    this.assertVendorOrAdmin(user);
    const store = await this.prisma.store.findFirst({
      where: { ownerId: user.id },
      select: { id: true },
    });

    if (!store) {
      throw new NotFoundException('فروشگاهی برای این فروشنده یافت نشد');
    }

    const wallet = await this.ensureWallet(store.id);
    return this.prisma.storeWallet.findUnique({
      where: { id: wallet.id },
      include: {
        store: {
          select: { id: true, name: true, slug: true, ownerId: true },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });
  }

  async adminAdjustWallet(user: AuthenticatedUser, storeId: number, dto: ManualWalletAdjustmentDto) {
    this.assertAdmin(user);
    const wallet = await this.ensureWallet(storeId);
    const amount = this.roundMoney(dto.amount);

    if (dto.direction === WalletTransactionDirection.DEBIT && Number(wallet.availableBalance) < amount) {
      throw new ConflictException('موجودی قابل برداشت/استفاده فروشگاه برای این برداشت کافی نیست');
    }

    const signed = dto.direction === WalletTransactionDirection.CREDIT ? amount : -amount;
    const transactionType = dto.type ?? (dto.direction === WalletTransactionDirection.CREDIT
      ? WalletTransactionType.MANUAL_CREDIT
      : WalletTransactionType.MANUAL_DEBIT);

    return this.prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.storeWallet.update({
        where: { id: wallet.id },
        data: {
          currentBalance: {
            increment: signed,
          },
          availableBalance: {
            increment: signed,
          },
        },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          storeId,
          type: transactionType,
          direction: dto.direction,
          amount,
          title: dto.title,
          description: dto.description,
          batchKey: dto.batchKey,
          createdByUserId: user.id,
          metadata: this.toInputJson(dto.metadata),
        },
      });

      await this.domainEvents.record(tx, {
        eventType: DomainEventType.WALLET_ADJUSTED,
        aggregateType: 'wallet',
        aggregateId: wallet.id,
        actorUserId: user.id,
        storeId,
        walletId: wallet.id,
        summary: `کیف پول فروشگاه #${storeId} به‌صورت دستی تنظیم شد`,
        payload: {
          direction: dto.direction,
          amount,
          type: transactionType,
          title: dto.title,
        },
      });

      return {
        wallet: updatedWallet,
        transaction,
      };
    }, FINANCE_TX_OPTIONS);
  }

  async resolveOrderFinance(input: {
    storeId: number;
    discountedItemSubtotal: number;
    pricing: Record<string, unknown>;
    coupon: Record<string, unknown> | null;
    orderedAt?: Date;
  }) {
    const rule = await this.resolveApplicableCommissionRule({
      storeId: input.storeId,
      at: input.orderedAt ?? new Date(),
    });

    const store = await this.prisma.store.findUnique({
      where: { id: input.storeId },
      select: {
        id: true,
        vendorHealthStatus: true,
        vendorHealthSnapshot: true,
      },
    });

    if (!store) {
      throw new NotFoundException('فروشگاه سفارش براي محاسبه مالي يافت نشد');
    }

    const riskPolicy = this.extractRiskPolicy(store.vendorHealthSnapshot);
    const commissionBaseAmount = this.roundMoney(input.discountedItemSubtotal);
    const commissionRate = Number(rule?.commissionRate ?? 0);
    const systemServiceFeeRate = Number(rule?.systemServiceFeeRate ?? 0);
    const systemServiceFeeFixed = Number(rule?.systemServiceFeeFixed ?? 0);
    const settlementHoldDays = Number(
      riskPolicy.settlementHoldDaysOverride ?? rule?.settlementHoldDays ?? 7,
    );
    const complaintWindowHours = Number(rule?.complaintWindowHours ?? 24);
    const autoReleaseEnabled = riskPolicy.autoSettlementHoldEnabled
      ? false
      : rule?.autoReleaseEnabled ?? true;

    const platformCommissionAmount = this.roundMoney(
      commissionBaseAmount * (commissionRate / 100),
    );
    const systemServiceFeeAmount = this.roundMoney(
      commissionBaseAmount * (systemServiceFeeRate / 100) + systemServiceFeeFixed,
    );
    const platformTotalShareAmount = this.roundMoney(
      platformCommissionAmount + systemServiceFeeAmount,
    );
    const vendorShareAmount = this.roundMoney(
      Math.max(0, commissionBaseAmount - platformTotalShareAmount),
    );

    return {
      settlementStatus: SettlementStatus.PENDING,
      commissionRuleId: rule?.id ?? null,
      commissionRuleTitle: rule?.title ?? null,
      commissionRuleScope: rule?.scope ?? null,
      commissionRate,
      commissionBaseAmount,
      platformCommissionAmount,
      systemServiceFeeRate,
      systemServiceFeeFixed,
      systemServiceFeeAmount,
      settlementHoldDays,
      complaintWindowHours,
      autoReleaseEnabled,
      platformTotalShareAmount,
      vendorShareAmount,
      financialSnapshot: {
        basis: {
          discountedItemSubtotal: commissionBaseAmount,
          deliveryExcludedFromCommission: true,
          discountBurdenMode: 'shared_by_commission',
        },
        appliedRule: rule
          ? {
              id: rule.id,
              title: rule.title,
              scope: rule.scope,
              storeId: rule.storeId,
              commissionRate,
              systemServiceFeeRate,
              systemServiceFeeFixed,
              settlementHoldDays,
              complaintWindowHours,
              autoReleaseEnabled,
              priority: rule.priority,
              reason: rule.reason,
            }
          : null,
        riskPolicy: {
          autoSettlementHoldEnabled: riskPolicy.autoSettlementHoldEnabled,
          settlementHoldDaysOverride: riskPolicy.settlementHoldDaysOverride,
          manualReviewRequired: riskPolicy.manualReviewRequired,
          blockNewDiscounts: riskPolicy.blockNewDiscounts,
          source: riskPolicy.source,
          note: riskPolicy.note,
          vendorHealthStatus: store.vendorHealthStatus,
        },
        amounts: {
          commissionBaseAmount,
          platformCommissionAmount,
          systemServiceFeeAmount,
          platformTotalShareAmount,
          vendorShareAmount,
          settlementHoldDays,
          complaintWindowHours,
          autoReleaseEnabled,
        },
        pricing: input.pricing,
        coupon: input.coupon,
      } as Prisma.InputJsonValue,
    };
  }

  async holdOrderVendorEarning(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        storeId: true,
        storeName: true,
        vendorShareAmount: true,
        settlementStatus: true,
        settlementHoldDays: true,
        settlementAutoReleaseEnabled: true,
        settlementEligibleAt: true,
        earningsHeldAt: true,
      },
    });

    if (!order || !order.storeId) {
      throw new NotFoundException('order مناسب برای hold earning یافت نشد');
    }

    if (order.status !== OrderStatus.DELIVERED) {
      throw new ConflictException('earning فقط بعد از تحویل شدن سفارش می‌تواند hold شود');
    }

    if (Number(order.vendorShareAmount) <= 0) {
      return null;
    }

    if (order.earningsHeldAt) {
      return order;
    }

    if (order.settlementStatus === SettlementStatus.REVERSED) {
      throw new ConflictException('برای order برگشت‌خورده امکان hold earning وجود ندارد');
    }

    const heldAt = new Date();
    const eligibleAt = new Date(
      heldAt.getTime() + order.settlementHoldDays * 24 * 60 * 60 * 1000,
    );

    const wallet = await this.ensureWallet(order.storeId);

    return this.prisma.$transaction(async (tx) => {
      await tx.storeWallet.update({
        where: { id: wallet.id },
        data: {
          currentBalance: {
            increment: order.vendorShareAmount,
          },
          heldBalance: {
            increment: order.vendorShareAmount,
          },
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          storeId: order.storeId!,
          orderId: order.id,
          type: WalletTransactionType.ORDER_EARNING,
          direction: WalletTransactionDirection.CREDIT,
          amount: order.vendorShareAmount,
          title: `درآمد معلق سفارش #${order.id}`,
          description: 'درآمد سفارش ثبت شد و تا پایان بازه بررسی در held balance نگه داشته می‌شود',
          metadata: {
            stage: 'held',
            holdDays: order.settlementHoldDays,
          } as Prisma.InputJsonValue,
        },
      });

      await this.domainEvents.record(tx, {
        eventType: DomainEventType.SETTLEMENT_HELD,
        aggregateType: 'order',
        aggregateId: order.id,
        storeId: order.storeId,
        orderId: order.id,
        walletId: wallet.id,
        summary: `درآمد سفارش #${order.id} hold شد`,
        payload: {
          vendorShareAmount: Number(order.vendorShareAmount),
          holdDays: order.settlementHoldDays,
        },
      });

      return tx.order.update({
        where: { id: order.id },
        data: {
          settlementStatus: SettlementStatus.ON_HOLD,
          settlementAutoReleaseEnabled: order.settlementAutoReleaseEnabled,
          settlementEligibleAt: eligibleAt,
          earningsHeldAt: heldAt,
        },
      });
    }, FINANCE_TX_OPTIONS);
  }

  async adminReleaseOrderSettlement(user: AuthenticatedUser, orderId: number) {
    this.assertAdmin(user);
    return this.releaseOrderSettlement(orderId, { actorUserId: user.id, mode: 'manual' });
  }

  async adminReleaseDueSettlements(user: AuthenticatedUser) {
    this.assertAdmin(user);
    return this.releaseEligibleSettlements();
  }

  async releaseEligibleSettlements() {
    const now = new Date();
    const dueOrders = await this.prisma.order.findMany({
      where: {
        settlementStatus: SettlementStatus.ON_HOLD,
        settlementAutoReleaseEnabled: true,
        settlementEligibleAt: { lte: now },
        earningsHeldAt: { not: null },
        earningsReleasedAt: null,
        supportTickets: {
          none: {
            status: {
              in: [
                SupportTicketStatus.OPEN,
                SupportTicketStatus.IN_REVIEW,
                SupportTicketStatus.WAITING_CUSTOMER,
                SupportTicketStatus.WAITING_VENDOR,
                SupportTicketStatus.ESCALATED_TO_FINANCE,
              ],
            },
          },
        },
      },
      select: { id: true },
      orderBy: { settlementEligibleAt: 'asc' },
    });

    let releasedCount = 0;
    for (const order of dueOrders) {
      await this.releaseOrderSettlement(order.id, { mode: 'auto' });
      releasedCount += 1;
    }

    return { releasedCount };
  }

  async reverseOrderSettlement(orderId: number, actorUserId?: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        storeId: true,
        vendorShareAmount: true,
        settlementStatus: true,
        earningsHeldAt: true,
        earningsReleasedAt: true,
        settlementReversedAmount: true,
        supportTickets: {
          where: {
            status: {
              in: [
                SupportTicketStatus.OPEN,
                SupportTicketStatus.IN_REVIEW,
                SupportTicketStatus.WAITING_CUSTOMER,
                SupportTicketStatus.WAITING_VENDOR,
                SupportTicketStatus.ESCALATED_TO_FINANCE,
              ],
            },
          },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!order || !order.storeId || !order.earningsHeldAt) {
      return null;
    }

    if (order.settlementStatus === SettlementStatus.REVERSED) {
      return null;
    }

    const remainingReversibleAmount = this.roundMoney(
      Math.max(
        0,
        Number(order.vendorShareAmount) - Number(order.settlementReversedAmount),
      ),
    );

    if (remainingReversibleAmount <= 0) {
      return null;
    }

    const storeId = order.storeId;
    const wallet = await this.ensureWallet(order.storeId);

    return this.prisma.$transaction(async (tx) => {
      await tx.storeWallet.update({
        where: { id: wallet.id },
        data: order.earningsReleasedAt
          ? {
              currentBalance: { decrement: remainingReversibleAmount },
              availableBalance: { decrement: remainingReversibleAmount },
            }
          : {
              currentBalance: { decrement: remainingReversibleAmount },
              heldBalance: { decrement: remainingReversibleAmount },
            },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          storeId,
          orderId: order.id,
          type: WalletTransactionType.ORDER_REVERSAL,
          direction: WalletTransactionDirection.DEBIT,
          amount: remainingReversibleAmount,
          title: `برگشت مالی سفارش #${order.id}`,
          description: 'به دلیل لغو یا برگشت سفارش، درآمد ثبت شده فروشنده برگشت داده شد',
          createdByUserId: actorUserId,
          metadata: {
            stage: order.earningsReleasedAt ? 'available-reversal' : 'held-reversal',
          } as Prisma.InputJsonValue,
        },
      });

      await this.domainEvents.record(tx, {
        eventType: DomainEventType.SETTLEMENT_REVERSED,
        aggregateType: 'order',
        aggregateId: order.id,
        actorUserId: actorUserId ?? null,
        storeId,
        orderId: order.id,
        walletId: wallet.id,
        summary: `settlement سفارش #${order.id} reverse شد`,
        payload: {
          amount: remainingReversibleAmount,
          stage: order.earningsReleasedAt ? 'available-reversal' : 'held-reversal',
        },
      });

      return tx.order.update({
        where: { id: order.id },
        data: {
          settlementStatus: SettlementStatus.REVERSED,
          settlementReversedAmount: {
            increment: remainingReversibleAmount,
          },
        },
      });
    }, FINANCE_TX_OPTIONS);
  }

  async applySettlementReversal(input: {
    orderId: number;
    amount?: number;
    actorUserId?: number;
    note?: string;
  }) {
    const order = await this.prisma.order.findUnique({
      where: { id: input.orderId },
      select: {
        id: true,
        storeId: true,
        vendorShareAmount: true,
        settlementStatus: true,
        earningsHeldAt: true,
        earningsReleasedAt: true,
        settlementReleasedAmount: true,
        settlementReversedAmount: true,
      },
    });

    if (!order || !order.storeId || !order.earningsHeldAt) {
      throw new NotFoundException('order مناسب برای reversal settlement یافت نشد');
    }

    if (order.settlementStatus === SettlementStatus.REVERSED) {
      throw new ConflictException('settlement این order قبلا کامل reverse شده است');
    }

    const maxReversibleAmount = this.roundMoney(
      Math.max(
        0,
        Number(order.vendorShareAmount) - Number(order.settlementReversedAmount),
      ),
    );

    if (maxReversibleAmount <= 0) {
      throw new ConflictException('مبلغی برای reversal باقی نمانده است');
    }

    const reversalAmount = this.roundMoney(input.amount ?? maxReversibleAmount);

    if (reversalAmount <= 0 || reversalAmount > maxReversibleAmount) {
      throw new BadRequestException('مبلغ reversal نامعتبر است');
    }

    const releasedAmount = this.roundMoney(
      Number(order.settlementReleasedAmount) > 0
        ? Number(order.settlementReleasedAmount)
        : order.earningsReleasedAt
          ? Math.max(0, Number(order.vendorShareAmount) - Number(order.settlementReversedAmount))
          : 0,
    );
    const fromAvailableAmount = Math.min(releasedAmount, reversalAmount);
    const fromHeldAmount = this.roundMoney(reversalAmount - fromAvailableAmount);

    const wallet = await this.ensureWallet(order.storeId);

    if (fromAvailableAmount > Number(wallet.availableBalance)) {
      throw new ConflictException('موجودی available wallet برای reversal کافی نیست');
    }

    if (fromHeldAmount > Number(wallet.heldBalance)) {
      throw new ConflictException('موجودی held wallet برای reversal کافی نیست');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.storeWallet.update({
        where: { id: wallet.id },
        data: {
          currentBalance: { decrement: reversalAmount },
          ...(fromAvailableAmount > 0
            ? { availableBalance: { decrement: fromAvailableAmount } }
            : {}),
          ...(fromHeldAmount > 0
            ? { heldBalance: { decrement: fromHeldAmount } }
            : {}),
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          storeId: order.storeId!,
          orderId: order.id,
          type: WalletTransactionType.ORDER_REVERSAL,
          direction: WalletTransactionDirection.DEBIT,
          amount: reversalAmount,
          title:
            reversalAmount === maxReversibleAmount
              ? `برگشت کامل settlement سفارش #${order.id}`
              : `برگشت جزئی settlement سفارش #${order.id}`,
          description:
            input.note ??
            (reversalAmount === maxReversibleAmount
              ? 'تمام سهم فروشنده از order به دلیل تصمیم مالی reverse شد'
              : 'بخشی از سهم فروشنده از order به دلیل تصمیم مالی reverse شد'),
          createdByUserId: input.actorUserId,
          metadata: {
            stage: fromAvailableAmount > 0 && fromHeldAmount > 0
              ? 'mixed-reversal'
              : fromAvailableAmount > 0
                ? 'available-reversal'
                : 'held-reversal',
            reversedAmount: reversalAmount,
            fromAvailableAmount,
            fromHeldAmount,
            remainingReversibleAmount: this.roundMoney(maxReversibleAmount - reversalAmount),
          } as Prisma.InputJsonValue,
        },
      });

      await this.domainEvents.record(tx, {
        eventType: DomainEventType.SETTLEMENT_REVERSED,
        aggregateType: 'order',
        aggregateId: order.id,
        actorUserId: input.actorUserId ?? null,
        storeId: order.storeId,
        orderId: order.id,
        walletId: wallet.id,
        summary:
          reversalAmount === maxReversibleAmount
            ? `settlement سفارش #${order.id} کامل reverse شد`
            : `settlement سفارش #${order.id} جزئی reverse شد`,
        payload: {
          reversalAmount,
          fromAvailableAmount,
          fromHeldAmount,
        },
      });

      return tx.order.update({
        where: { id: order.id },
        data: {
          settlementReversedAmount: {
            increment: reversalAmount,
          },
          settlementStatus:
            reversalAmount === maxReversibleAmount
              ? SettlementStatus.REVERSED
              : SettlementStatus.ON_HOLD,
          settlementReviewedAt: new Date(),
          settlementReviewedByUserId: input.actorUserId ?? null,
        },
      });
    }, FINANCE_TX_OPTIONS);
  }

  private extractRiskPolicy(snapshot: Prisma.JsonValue | null) {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      return {
        autoSettlementHoldEnabled: false,
        settlementHoldDaysOverride: null,
        manualReviewRequired: false,
        blockNewDiscounts: false,
        source: 'AUTO',
        note: '',
      };
    }

    const effective = (snapshot as Record<string, unknown>).riskPolicyEffective;
    if (!effective || typeof effective !== 'object' || Array.isArray(effective)) {
      return {
        autoSettlementHoldEnabled: false,
        settlementHoldDaysOverride: null,
        manualReviewRequired: false,
        blockNewDiscounts: false,
        source: 'AUTO',
        note: '',
      };
    }

    const policy = effective as Record<string, unknown>;
    return {
      autoSettlementHoldEnabled: Boolean(policy.autoSettlementHoldEnabled),
      settlementHoldDaysOverride:
        typeof policy.settlementHoldDaysOverride === 'number'
          ? policy.settlementHoldDaysOverride
          : null,
      manualReviewRequired: Boolean(policy.manualReviewRequired),
      blockNewDiscounts: Boolean(policy.blockNewDiscounts),
      source: policy.source === 'MANUAL_OVERRIDE' ? 'MANUAL_OVERRIDE' : 'AUTO',
      note: typeof policy.note === 'string' ? policy.note : '',
    };
  }

  private async resolveApplicableCommissionRule(input: { storeId: number; at: Date }) {
    const candidates = await this.prisma.commissionRule.findMany({
      where: {
        isActive: true,
        OR: [
          { scope: CommissionRuleScope.GLOBAL },
          { scope: CommissionRuleScope.STORE, storeId: input.storeId },
        ],
      },
      orderBy: [{ priority: 'asc' }, { id: 'desc' }],
    });

    const activeCandidates = candidates.filter((rule) => this.isActiveAt(rule, input.at));
    if (activeCandidates.length === 0) {
      return null;
    }

    activeCandidates.sort((a, b) => {
      const aSpecificity = a.scope === CommissionRuleScope.STORE ? 0 : 1;
      const bSpecificity = b.scope === CommissionRuleScope.STORE ? 0 : 1;
      if (aSpecificity !== bSpecificity) {
        return aSpecificity - bSpecificity;
      }
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      const aStart = a.startAt?.getTime() ?? 0;
      const bStart = b.startAt?.getTime() ?? 0;
      return bStart - aStart;
    });

    return activeCandidates[0];
  }

  private async validateCommissionRuleDto(dto: {
    scope: CommissionRuleScope;
    storeId?: number;
    commissionRate: number;
    systemServiceFeeRate?: number;
    systemServiceFeeFixed?: number;
    settlementHoldDays?: number;
    complaintWindowHours?: number;
    autoReleaseEnabled?: boolean;
    title?: string;
    description?: string;
    priority?: number;
    isActive?: boolean;
    startAt?: Date;
    endAt?: Date;
    reason?: string;
  }) {
    if (dto.scope === CommissionRuleScope.STORE) {
      if (!dto.storeId) {
        throw new BadRequestException('برای rule فروشگاهی، storeId اجباری است');
      }

      const store = await this.prisma.store.findUnique({ where: { id: dto.storeId } });
      if (!store) {
        throw new NotFoundException('فروشگاه مورد نظر برای rule کمیسیون یافت نشد');
      }
    }

    if (dto.scope === CommissionRuleScope.GLOBAL && dto.storeId) {
      throw new BadRequestException('rule عمومی نباید storeId داشته باشد');
    }

    if (dto.startAt && dto.endAt && dto.startAt > dto.endAt) {
      throw new BadRequestException('startAt نمی‌تواند بعد از endAt باشد');
    }

    if (dto.systemServiceFeeRate !== undefined && dto.systemServiceFeeRate > 100) {
      throw new BadRequestException('systemServiceFeeRate نمی‌تواند بیشتر از 100 باشد');
    }

    if (dto.systemServiceFeeFixed !== undefined && dto.systemServiceFeeFixed < 0) {
      throw new BadRequestException('systemServiceFeeFixed نمی‌تواند منفی باشد');
    }

    if (dto.settlementHoldDays !== undefined && dto.settlementHoldDays < 0) {
      throw new BadRequestException('settlementHoldDays نمی‌تواند منفی باشد');
    }

    if (dto.complaintWindowHours !== undefined && dto.complaintWindowHours < 1) {
      throw new BadRequestException('complaintWindowHours باید حداقل 1 ساعت باشد');
    }
  }

  private async getCommissionRuleOrThrow(id: number) {
    const rule = await this.prisma.commissionRule.findUnique({
      where: { id },
      include: this.commissionRuleInclude(),
    });

    if (!rule) {
      throw new NotFoundException('commission rule مورد نظر یافت نشد');
    }

    return rule;
  }

  private async ensureWallet(storeId: number) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true },
    });

    if (!store) {
      throw new NotFoundException('فروشگاه مورد نظر یافت نشد');
    }

    return this.prisma.storeWallet.upsert({
      where: { storeId },
      update: {},
      create: { storeId },
    });
  }

  private commissionRuleInclude() {
    return {
      store: {
        select: { id: true, name: true, slug: true, ownerId: true },
      },
    } satisfies Prisma.CommissionRuleInclude;
  }

  private assertAdmin(user: AuthenticatedUser) {
    if (!user.roles.includes('ADMIN')) {
      throw new ForbiddenException('این endpoint فقط برای ادمین مجاز است');
    }
  }

  private assertVendorOrAdmin(user: AuthenticatedUser) {
    if (!user.roles.some((role) => role === 'ADMIN' || role === 'VENDOR')) {
      throw new ForbiddenException('این endpoint فقط برای فروشنده یا ادمین مجاز است');
    }
  }

  private isActiveAt(rule: CommissionRule, at: Date) {
    if (rule.startAt && rule.startAt > at) {
      return false;
    }

    if (rule.endAt && rule.endAt < at) {
      return false;
    }

    return true;
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

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private async releaseOrderSettlement(
    orderId: number,
    input: { actorUserId?: number; mode: 'manual' | 'auto' },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        storeId: true,
        vendorShareAmount: true,
        settlementStatus: true,
        settlementEligibleAt: true,
        earningsHeldAt: true,
        earningsReleasedAt: true,
        settlementReleasedAmount: true,
        settlementReversedAmount: true,
        supportTickets: {
          where: {
            status: {
              in: [
                SupportTicketStatus.OPEN,
                SupportTicketStatus.IN_REVIEW,
                SupportTicketStatus.WAITING_CUSTOMER,
                SupportTicketStatus.WAITING_VENDOR,
                SupportTicketStatus.ESCALATED_TO_FINANCE,
              ],
            },
          },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!order || !order.storeId) {
      throw new NotFoundException('order مناسب برای release settlement یافت نشد');
    }

    if (order.settlementStatus === SettlementStatus.REVERSED) {
      throw new ConflictException('settlement این order برگشت خورده و قابل release نیست');
    }

    if (!order.earningsHeldAt) {
      throw new ConflictException('این order هنوز earning hold شده ندارد');
    }

    if (order.earningsReleasedAt) {
      throw new ConflictException('settlement این order قبلا release شده است');
    }

    if (order.supportTickets.length > 0) {
      throw new ConflictException('برای این order تیکت فعال وجود دارد و settlement قابل release نیست');
    }

    if (
      input.mode === 'auto' &&
      order.settlementEligibleAt &&
      order.settlementEligibleAt.getTime() > Date.now()
    ) {
      throw new ConflictException('هنوز زمان auto release این order نرسیده است');
    }

    const releasableAmount = this.roundMoney(
      Math.max(
        0,
        Number(order.vendorShareAmount) -
          Number(order.settlementReleasedAmount) -
          Number(order.settlementReversedAmount),
      ),
    );

    if (releasableAmount <= 0) {
      throw new ConflictException('مبلغی برای release settlement باقی نمانده است');
    }

    const wallet = await this.ensureWallet(order.storeId);

    if (releasableAmount > Number(wallet.heldBalance)) {
      throw new ConflictException('موجودی held wallet برای release این settlement کافی نیست');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.storeWallet.update({
        where: { id: wallet.id },
        data: {
          heldBalance: {
            decrement: releasableAmount,
          },
          availableBalance: {
            increment: releasableAmount,
          },
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          storeId: order.storeId!,
          orderId: order.id,
          type: WalletTransactionType.ORDER_RELEASE,
          direction: WalletTransactionDirection.CREDIT,
          amount: releasableAmount,
          title:
            input.mode === 'manual'
              ? `آزادسازی دستی درآمد سفارش #${order.id}`
              : `آزادسازی خودکار درآمد سفارش #${order.id}`,
          description:
            input.mode === 'manual'
              ? 'درآمد held شده سفارش توسط ادمین/مالی آزاد شد'
              : 'درآمد held شده سفارش پس از پایان بازه بررسی به صورت خودکار آزاد شد',
          createdByUserId: input.actorUserId,
          metadata: {
            stage: 'released',
            mode: input.mode,
          } as Prisma.InputJsonValue,
        },
      });

      await this.domainEvents.record(tx, {
        eventType: DomainEventType.SETTLEMENT_RELEASED,
        aggregateType: 'order',
        aggregateId: order.id,
        actorUserId: input.actorUserId ?? null,
        storeId: order.storeId,
        orderId: order.id,
        walletId: wallet.id,
        summary:
          input.mode === 'manual'
            ? `settlement سفارش #${order.id} دستی آزاد شد`
            : `settlement سفارش #${order.id} خودکار آزاد شد`,
        payload: {
          amount: releasableAmount,
          mode: input.mode,
        },
      });

      return tx.order.update({
        where: { id: order.id },
        data: {
          settlementStatus: SettlementStatus.SETTLED,
          earningsReleasedAt: new Date(),
          settlementReleasedAmount: {
            increment: releasableAmount,
          },
          settlementReviewedAt: new Date(),
          settlementReviewedByUserId: input.actorUserId ?? null,
        },
      });
    }, FINANCE_TX_OPTIONS);
  }
}
