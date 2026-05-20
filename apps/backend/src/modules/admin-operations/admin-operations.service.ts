import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  DomainEventStatus,
  DomainEventType,
  OrderStatus,
  PaymentMethod,
  PaymentReviewStatus,
  PaymentStatus,
  Prisma,
  SettlementStatus,
  SupportTicketStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminAlertAction, UpdateAlertStatusDto } from './dto/update-alert-status.dto';

type AuthenticatedUser = {
  id: number;
  roles: string[];
};

const ACTIVE_TICKET_STATUSES: SupportTicketStatus[] = [
  SupportTicketStatus.OPEN,
  SupportTicketStatus.IN_REVIEW,
  SupportTicketStatus.WAITING_CUSTOMER,
  SupportTicketStatus.WAITING_VENDOR,
  SupportTicketStatus.ESCALATED_TO_FINANCE,
];

type AlertSeverity = 'HIGH' | 'MEDIUM' | 'LOW';
type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'SNOOZED';

type AdminAlertItem = {
  key: string;
  type: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  storeId: number | null;
  storeName: string | null;
  orderId?: number | null;
  paymentId?: number | null;
  supportTicketId?: number | null;
  createdAt: Date;
  evidence?: Record<string, unknown>;
  latestAction?: {
    action: AlertStatus;
    actorUserId: number | null;
    note: string | null;
    happenedAt: string | null;
    snoozeUntil?: string | null;
  } | null;
};

@Injectable()
export class AdminOperationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrderExceptions(user: AuthenticatedUser) {
    this.assertAdmin(user);

    const items = await this.prisma.order.findMany({
      where: {
        OR: [
          {
            paymentMethod: PaymentMethod.ONLINE,
            status: { in: [OrderStatus.PENDING, OrderStatus.PAID] },
            paymentStatus: { in: [PaymentStatus.FAILED, PaymentStatus.EXPIRED] },
          },
          {
            status: OrderStatus.DELIVERED,
            settlementStatus: SettlementStatus.PENDING,
          },
          {
            status: OrderStatus.DELIVERED,
            settlementStatus: SettlementStatus.ON_HOLD,
            settlementEligibleAt: { lt: new Date() },
            earningsReleasedAt: null,
          },
        ],
      },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        settlementStatus: true,
        settlementEligibleAt: true,
        createdAt: true,
        storeId: true,
        storeName: true,
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 100,
    });

    return items.map((item) => ({
      ...item,
      exceptionReasons: [
        ...(item.paymentStatus === PaymentStatus.EXPIRED || item.paymentStatus === PaymentStatus.FAILED
          ? ['PAYMENT_STATE_NEEDS_ATTENTION']
          : []),
        ...(item.status === OrderStatus.DELIVERED && item.settlementStatus === SettlementStatus.PENDING
          ? ['DELIVERED_NOT_HELD']
          : []),
        ...(item.settlementStatus === SettlementStatus.ON_HOLD &&
        item.settlementEligibleAt &&
        item.settlementEligibleAt.getTime() < Date.now()
          ? ['SETTLEMENT_OVERDUE']
          : []),
      ],
    }));
  }

  async getPaymentExceptions(user: AuthenticatedUser) {
    this.assertAdmin(user);

    return this.prisma.payment.findMany({
      where: {
        OR: [
          {
            reviewStatus: {
              in: [PaymentReviewStatus.NEEDS_REVIEW, PaymentReviewStatus.UNDER_REVIEW],
            },
          },
          { status: PaymentStatus.FAILED },
          {
            status: PaymentStatus.PAID,
            order: {
              paymentStatus: { not: PaymentStatus.PAID },
            },
          },
        ],
      },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            paymentStatus: true,
            storeId: true,
            storeName: true,
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 100,
    });
  }

  async getSettlementExceptions(user: AuthenticatedUser) {
    this.assertAdmin(user);

    return this.prisma.order.findMany({
      where: {
        OR: [
          {
            settlementStatus: SettlementStatus.ON_HOLD,
            settlementEligibleAt: { lt: new Date() },
            earningsReleasedAt: null,
            supportTickets: {
              none: {
                status: { in: ACTIVE_TICKET_STATUSES },
              },
            },
          },
          {
            settlementStatus: SettlementStatus.REVERSED,
            settlementReversedAmount: { gt: 0 },
          },
        ],
      },
      select: {
        id: true,
        status: true,
        settlementStatus: true,
        settlementEligibleAt: true,
        settlementReleasedAmount: true,
        settlementReversedAmount: true,
        storeId: true,
        storeName: true,
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 100,
    });
  }

  async getSupportFollowUps(user: AuthenticatedUser) {
    this.assertAdmin(user);

    return this.prisma.supportTicket.findMany({
      where: {
        status: {
          in: ACTIVE_TICKET_STATUSES,
        },
      },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            paymentStatus: true,
            settlementStatus: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: [{ updatedAt: 'asc' }],
      take: 100,
    });
  }

  async getAlerts(user: AuthenticatedUser) {
    this.assertAdmin(user);

    const baseAlerts = await this.buildBaseAlerts();
    const lifecycleByKey = await this.getLatestLifecycleByKeys(baseAlerts.map((item) => item.key));

    return baseAlerts
      .map((alert) => this.attachLifecycle(alert, lifecycleByKey.get(alert.key) ?? null))
      .filter((alert) => {
        if (alert.status === 'RESOLVED') {
          return false;
        }

        if (alert.status === 'SNOOZED' && alert.latestAction?.snoozeUntil) {
          return new Date(alert.latestAction.snoozeUntil).getTime() <= Date.now();
        }

        return true;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateAlertStatus(user: AuthenticatedUser, key: string, dto: UpdateAlertStatusDto) {
    this.assertAdmin(user);

    const baseAlerts = await this.buildBaseAlerts();
    const target = baseAlerts.find((item) => item.key === key);

    if (!target) {
      throw new NotFoundException('alert مورد نظر یافت نشد');
    }

    if (dto.action === AdminAlertAction.SNOOZE && !dto.snoozeUntil) {
      throw new BadRequestException('برای snooze باید snoozeUntil ارسال شود');
    }

    const lifecycleStatus = this.mapActionToStatus(dto.action);
    const snoozeUntil = dto.snoozeUntil ? new Date(dto.snoozeUntil) : null;
    if (dto.action === AdminAlertAction.SNOOZE && (!snoozeUntil || Number.isNaN(snoozeUntil.getTime()))) {
      throw new BadRequestException('مقدار snoozeUntil نامعتبر است');
    }

    return this.prisma.domainEvent.create({
      data: {
        eventType: DomainEventType.WALLET_ADJUSTED,
        aggregateType: 'admin-alert',
        aggregateId: 0,
        actorUserId: user.id,
        storeId: target.storeId,
        orderId: target.orderId ?? null,
        paymentId: target.paymentId ?? null,
        supportTicketId: target.supportTicketId ?? null,
        summary: key,
        payload: {
          alertType: target.type,
          action: dto.action,
          status: lifecycleStatus,
        } as Prisma.InputJsonValue,
        metadata: {
          note: dto.note ?? null,
          status: lifecycleStatus,
          snoozeUntil: snoozeUntil ? snoozeUntil.toISOString() : null,
        } as Prisma.InputJsonValue,
        status: DomainEventStatus.PROCESSED,
        processedAt: new Date(),
      },
    });
  }

  async getVendorPolicyTimeline(user: AuthenticatedUser, storeId: number) {
    this.assertAdmin(user);

    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        name: true,
        slug: true,
        ownerId: true,
        isVerified: true,
        vendorHealthScore: true,
        vendorHealthStatus: true,
        vendorHealthSnapshot: true,
      },
    });

    if (!store) {
      throw new NotFoundException('فروشگاه مورد نظر یافت نشد');
    }

    const events = await this.prisma.domainEvent.findMany({
      where: {
        OR: [
          {
            aggregateType: 'admin-alert',
            storeId,
          },
          {
            aggregateType: 'review',
            storeId,
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const snapshot = this.asObject(store.vendorHealthSnapshot);

    return {
      store: {
        id: store.id,
        name: store.name,
        slug: store.slug,
        ownerId: store.ownerId,
        isVerified: store.isVerified,
        vendorHealthScore: store.vendorHealthScore,
        vendorHealthStatus: store.vendorHealthStatus,
      },
      currentPolicy: {
        auto: this.asObject(snapshot.riskPolicyAuto),
        manualOverride: this.asObject(snapshot.riskPolicyManualOverride),
        effective: this.asObject(snapshot.riskPolicyEffective),
      },
      timeline: events.map((event) => ({
        id: event.id,
        aggregateType: event.aggregateType,
        summary: event.summary,
        payload: event.payload,
        metadata: event.metadata,
        actorUserId: event.actorUserId,
        createdAt: event.createdAt,
      })),
    };
  }

  private async buildBaseAlerts(): Promise<AdminAlertItem[]> {
    const [orders, blockedPayments, tickets, stores] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          OR: [
            {
              status: OrderStatus.DELIVERED,
              settlementStatus: SettlementStatus.PENDING,
            },
            {
              settlementStatus: SettlementStatus.ON_HOLD,
              settlementEligibleAt: { lt: new Date() },
              earningsReleasedAt: null,
            },
          ],
        },
        select: {
          id: true,
          status: true,
          settlementStatus: true,
          settlementEligibleAt: true,
          updatedAt: true,
          storeId: true,
          storeName: true,
        },
        orderBy: [{ updatedAt: 'desc' }],
        take: 100,
      }),
      this.prisma.order.findMany({
        where: {
          paymentMethod: PaymentMethod.ONLINE,
          status: { in: [OrderStatus.PENDING, OrderStatus.PAID] },
        },
        select: {
          id: true,
          createdAt: true,
          storeId: true,
          storeName: true,
          payment: {
            select: {
              id: true,
              status: true,
            },
          },
          store: {
            select: {
              vendorHealthSnapshot: true,
            },
          },
        },
        take: 100,
      }),
      this.prisma.supportTicket.findMany({
        where: {
          status: {
            in: ACTIVE_TICKET_STATUSES,
          },
        },
        select: {
          id: true,
          orderId: true,
          status: true,
          updatedAt: true,
          storeId: true,
          store: {
            select: { name: true },
          },
        },
        take: 100,
      }),
      this.prisma.store.findMany({
        select: {
          id: true,
          name: true,
          vendorHealthStatus: true,
          vendorHealthScore: true,
          vendorHealthSnapshot: true,
          vendorHealthCalculatedAt: true,
        },
        take: 100,
      }),
    ]);

    const alerts: AdminAlertItem[] = [];

    for (const order of orders) {
      if (order.status === OrderStatus.DELIVERED && order.settlementStatus === SettlementStatus.PENDING) {
        alerts.push({
          key: `SETTLEMENT_NOT_HELD:${order.id}`,
          type: 'SETTLEMENT_NOT_HELD',
          severity: 'HIGH',
          status: 'OPEN',
          title: 'سفارش تحویل شده بدون hold مالی',
          message: `سفارش #${order.id} تحویل شده اما settlement آن هنوز hold نشده است`,
          storeId: order.storeId,
          storeName: order.storeName,
          orderId: order.id,
          createdAt: order.updatedAt,
          evidence: {
            settlementStatus: order.settlementStatus,
          },
        });
      }

      if (
        order.settlementStatus === SettlementStatus.ON_HOLD &&
        order.settlementEligibleAt &&
        order.settlementEligibleAt.getTime() < Date.now()
      ) {
        alerts.push({
          key: `SETTLEMENT_OVERDUE:${order.id}`,
          type: 'SETTLEMENT_OVERDUE',
          severity: 'MEDIUM',
          status: 'OPEN',
          title: 'settlement overdue',
          message: `مهلت release سفارش #${order.id} گذشته ولی هنوز release نشده است`,
          storeId: order.storeId,
          storeName: order.storeName,
          orderId: order.id,
          createdAt: order.updatedAt,
          evidence: {
            settlementEligibleAt: order.settlementEligibleAt,
          },
        });
      }
    }

    for (const order of blockedPayments) {
      const riskPolicy = this.extractRiskPolicy(order.store?.vendorHealthSnapshot ?? null);
      if (riskPolicy.manualReviewRequired) {
        alerts.push({
          key: `PAYMENT_BLOCKED_BY_POLICY:${order.id}`,
          type: 'PAYMENT_BLOCKED_BY_POLICY',
          severity: 'HIGH',
          status: 'OPEN',
          title: 'payment initiation blocked by policy',
          message: `سفارش آنلاین #${order.id} به دلیل policy ریسک فروشنده نیاز به بررسی دستی دارد`,
          storeId: order.storeId,
          storeName: order.storeName,
          orderId: order.id,
          paymentId: order.payment?.id ?? null,
          createdAt: order.createdAt,
          evidence: {
            manualReviewRequired: riskPolicy.manualReviewRequired,
            riskPolicySource: riskPolicy.source,
          },
        });
      }
    }

    for (const ticket of tickets) {
      alerts.push({
        key: `SUPPORT_PRESSURE:${ticket.id}`,
        type: 'SUPPORT_PRESSURE',
        severity: ticket.status === SupportTicketStatus.ESCALATED_TO_FINANCE ? 'HIGH' : 'LOW',
        status: 'OPEN',
        title: 'active support follow-up',
        message: `تیکت #${ticket.id} هنوز active است و نیاز به follow-up دارد`,
        storeId: ticket.storeId,
        storeName: ticket.store?.name ?? null,
        supportTicketId: ticket.id,
        orderId: ticket.orderId,
        createdAt: ticket.updatedAt,
        evidence: {
          status: ticket.status,
        },
      });
    }

    for (const store of stores) {
      const policy = this.extractRiskPolicy(store.vendorHealthSnapshot);
      if (policy.manualReviewRequired || policy.blockNewDiscounts) {
        alerts.push({
          key: `RISK_ESCALATION:${store.id}`,
          type: 'RISK_ESCALATION',
          severity: store.vendorHealthStatus === 'AT_RISK' ? 'HIGH' : 'MEDIUM',
          status: 'OPEN',
          title: 'vendor risk escalation',
          message: `فروشگاه ${store.name} تحت محدوديت policy ريسک قرار دارد`,
          storeId: store.id,
          storeName: store.name,
          createdAt: store.vendorHealthCalculatedAt ?? new Date(),
          evidence: {
            vendorHealthStatus: store.vendorHealthStatus,
            vendorHealthScore: store.vendorHealthScore,
            manualReviewRequired: policy.manualReviewRequired,
            blockNewDiscounts: policy.blockNewDiscounts,
            source: policy.source,
          },
        });
      }
    }

    return alerts;
  }

  private async getLatestLifecycleByKeys(keys: string[]) {
    if (keys.length === 0) {
      return new Map<string, AdminAlertItem['latestAction']>();
    }

    const events = await this.prisma.domainEvent.findMany({
      where: {
        aggregateType: 'admin-alert',
        summary: { in: keys },
      },
      orderBy: { createdAt: 'desc' },
    });

    const latestByKey = new Map<string, AdminAlertItem['latestAction']>();
    for (const event of events) {
      if (!event.summary || latestByKey.has(event.summary)) {
        continue;
      }

      const metadata = this.asObject(event.metadata);
      latestByKey.set(event.summary, {
        action: this.normalizeLifecycleStatus(metadata.status),
        actorUserId: event.actorUserId ?? null,
        note: typeof metadata.note === 'string' ? metadata.note : null,
        happenedAt: event.createdAt.toISOString(),
        snoozeUntil: typeof metadata.snoozeUntil === 'string' ? metadata.snoozeUntil : null,
      });
    }

    return latestByKey;
  }

  private attachLifecycle(
    alert: AdminAlertItem,
    latestAction: AdminAlertItem['latestAction'],
  ): AdminAlertItem {
    if (!latestAction) {
      return { ...alert, status: 'OPEN', latestAction: null };
    }

    const status = latestAction.action;
    return {
      ...alert,
      status,
      latestAction,
    };
  }

  private mapActionToStatus(action: AdminAlertAction): AlertStatus {
    switch (action) {
      case AdminAlertAction.ACKNOWLEDGE:
        return 'ACKNOWLEDGED';
      case AdminAlertAction.RESOLVE:
        return 'RESOLVED';
      case AdminAlertAction.REOPEN:
        return 'OPEN';
      case AdminAlertAction.SNOOZE:
        return 'SNOOZED';
      default:
        return 'OPEN';
    }
  }

  private normalizeLifecycleStatus(value: unknown): AlertStatus {
    if (value === 'ACKNOWLEDGED' || value === 'RESOLVED' || value === 'SNOOZED') {
      return value;
    }

    return 'OPEN';
  }

  private extractRiskPolicy(snapshot: Prisma.JsonValue | null) {
    const source = this.asObject(snapshot);
    const effective = this.asObject(source.riskPolicyEffective);

    return {
      manualReviewRequired: Boolean(effective.manualReviewRequired),
      blockNewDiscounts: Boolean(effective.blockNewDiscounts),
      source: effective.source === 'MANUAL_OVERRIDE' ? 'MANUAL_OVERRIDE' : 'AUTO',
    };
  }

  private asObject(value: Prisma.JsonValue | null | undefined): Record<string, any> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, any>;
  }

  private assertAdmin(user: AuthenticatedUser) {
    if (!user.roles.includes('ADMIN')) {
      throw new ForbiddenException('این endpoint فقط برای ادمین مجاز است');
    }
  }
}
