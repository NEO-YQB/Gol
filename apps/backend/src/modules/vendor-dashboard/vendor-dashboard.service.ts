import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  SettlementStatus,
  SupportTicketFinanceOutcome,
  SupportTicketReason,
  SupportTicketStatus,
  WalletTransactionDirection,
  WalletTransactionType,
} from '@prisma/client';
import {
  ResolvedJalaliDateRange,
  resolveJalaliDateRange,
} from '../../common/date/jalali-date-range.util';
import { PrismaService } from '../../prisma/prisma.service';
import { VendorDashboardDateRangeQueryDto } from './dto/vendor-dashboard-date-range-query.dto';

type AuthenticatedUser = {
  id: number;
  roles: string[];
};

@Injectable()
export class VendorDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getWalletSummary(user: AuthenticatedUser, query: VendorDashboardDateRangeQueryDto) {
    const store = await this.getVendorStoreOrThrow(user);
    const range = resolveJalaliDateRange(query);
    const wallet = await this.prisma.storeWallet.upsert({
      where: { storeId: store.id },
      update: {},
      create: { storeId: store.id },
      include: {
        transactions: {
          where: {
            createdAt: { gte: range.from, lte: range.to },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    const transactionGroups = await this.prisma.walletTransaction.groupBy({
      by: ['type', 'direction'],
      where: {
        storeId: store.id,
        createdAt: { gte: range.from, lte: range.to },
      },
      _count: { _all: true },
      _sum: { amount: true },
    });

    return {
      range: this.buildRangeResponse(range),
      store: this.toStoreSummary(store),
      wallet: {
        currentBalance: Number(wallet.currentBalance),
        availableBalance: Number(wallet.availableBalance),
        heldBalance: Number(wallet.heldBalance),
      },
      activity: {
        transactionCount: transactionGroups.reduce((sum, item) => sum + item._count._all, 0),
        creditAmount: transactionGroups
          .filter((item) => item.direction === WalletTransactionDirection.CREDIT)
          .reduce((sum, item) => sum + Number(item._sum.amount ?? 0), 0),
        debitAmount: transactionGroups
          .filter((item) => item.direction === WalletTransactionDirection.DEBIT)
          .reduce((sum, item) => sum + Number(item._sum.amount ?? 0), 0),
        byType: Object.values(WalletTransactionType).map((type) => {
          const matches = transactionGroups.filter((item) => item.type === type);
          return {
            type,
            count: matches.reduce((sum, item) => sum + item._count._all, 0),
            amount: matches.reduce((sum, item) => sum + Number(item._sum.amount ?? 0), 0),
          };
        }),
      },
      recentTransactions: wallet.transactions.map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        direction: transaction.direction,
        amount: Number(transaction.amount),
        title: transaction.title,
        description: transaction.description,
        orderId: transaction.orderId,
        createdAt: transaction.createdAt,
      })),
    };
  }

  async getSettlementsSummary(user: AuthenticatedUser, query: VendorDashboardDateRangeQueryDto) {
    const store = await this.getVendorStoreOrThrow(user);
    const range = resolveJalaliDateRange(query);

    const [statusGroups, amountAggregate, recentOrders] = await Promise.all([
      this.prisma.order.groupBy({
        by: ['settlementStatus'],
        where: {
          storeId: store.id,
          updatedAt: { gte: range.from, lte: range.to },
        },
        _count: { _all: true },
      }),
      this.prisma.order.aggregate({
        where: {
          storeId: store.id,
          updatedAt: { gte: range.from, lte: range.to },
        },
        _sum: {
          vendorShareAmount: true,
          settlementReleasedAmount: true,
          settlementReversedAmount: true,
        },
      }),
      this.prisma.order.findMany({
        where: {
          storeId: store.id,
          updatedAt: { gte: range.from, lte: range.to },
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          settlementStatus: true,
          vendorShareAmount: true,
          settlementReleasedAmount: true,
          settlementReversedAmount: true,
          settlementEligibleAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return {
      range: this.buildRangeResponse(range),
      store: this.toStoreSummary(store),
      counts: {
        pending: this.findGroupCount(statusGroups, 'settlementStatus', SettlementStatus.PENDING),
        eligible: this.findGroupCount(statusGroups, 'settlementStatus', SettlementStatus.ELIGIBLE),
        processing: this.findGroupCount(statusGroups, 'settlementStatus', SettlementStatus.PROCESSING),
        settled: this.findGroupCount(statusGroups, 'settlementStatus', SettlementStatus.SETTLED),
        onHold: this.findGroupCount(statusGroups, 'settlementStatus', SettlementStatus.ON_HOLD),
        reversed: this.findGroupCount(statusGroups, 'settlementStatus', SettlementStatus.REVERSED),
      },
      amounts: {
        vendorShareTotal: Number(amountAggregate._sum.vendorShareAmount ?? 0),
        releasedTotal: Number(amountAggregate._sum.settlementReleasedAmount ?? 0),
        reversedTotal: Number(amountAggregate._sum.settlementReversedAmount ?? 0),
        releasableEstimate: this.roundToTwo(
          Number(amountAggregate._sum.vendorShareAmount ?? 0) -
            Number(amountAggregate._sum.settlementReleasedAmount ?? 0) -
            Number(amountAggregate._sum.settlementReversedAmount ?? 0),
        ),
      },
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        settlementStatus: order.settlementStatus,
        vendorShareAmount: Number(order.vendorShareAmount),
        settlementReleasedAmount: Number(order.settlementReleasedAmount),
        settlementReversedAmount: Number(order.settlementReversedAmount),
        settlementEligibleAt: order.settlementEligibleAt,
        updatedAt: order.updatedAt,
      })),
    };
  }

  async getTicketsSummary(user: AuthenticatedUser, query: VendorDashboardDateRangeQueryDto) {
    const store = await this.getVendorStoreOrThrow(user);
    const range = resolveJalaliDateRange(query);
    const where: Prisma.SupportTicketWhereInput = {
      storeId: store.id,
      createdAt: { gte: range.from, lte: range.to },
    };

    const [totalCount, statusGroups, reasonGroups, financeOutcomeGroups, recentTickets] =
      await Promise.all([
        this.prisma.supportTicket.count({ where }),
        this.prisma.supportTicket.groupBy({
          by: ['status'],
          where,
          _count: { _all: true },
        }),
        this.prisma.supportTicket.groupBy({
          by: ['reason'],
          where,
          _count: { _all: true },
        }),
        this.prisma.supportTicket.groupBy({
          by: ['financeOutcome'],
          where: {
            ...where,
            financeOutcome: { not: null },
          },
          _count: { _all: true },
        }),
        this.prisma.supportTicket.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            orderId: true,
            reason: true,
            status: true,
            financeOutcome: true,
            createdAt: true,
            resolvedAt: true,
          },
        }),
      ]);

    return {
      range: this.buildRangeResponse(range),
      store: this.toStoreSummary(store),
      totals: {
        all: totalCount,
        open: this.findGroupCount(statusGroups, 'status', SupportTicketStatus.OPEN),
        inReview: this.findGroupCount(statusGroups, 'status', SupportTicketStatus.IN_REVIEW),
        waitingCustomer: this.findGroupCount(statusGroups, 'status', SupportTicketStatus.WAITING_CUSTOMER),
        waitingVendor: this.findGroupCount(statusGroups, 'status', SupportTicketStatus.WAITING_VENDOR),
        escalatedToFinance: this.findGroupCount(
          statusGroups,
          'status',
          SupportTicketStatus.ESCALATED_TO_FINANCE,
        ),
        resolved: this.findGroupCount(statusGroups, 'status', SupportTicketStatus.RESOLVED),
        rejected: this.findGroupCount(statusGroups, 'status', SupportTicketStatus.REJECTED),
        cancelled: this.findGroupCount(statusGroups, 'status', SupportTicketStatus.CANCELLED),
      },
      byReason: Object.values(SupportTicketReason).map((reason) => ({
        reason,
        count: this.findGroupCount(reasonGroups, 'reason', reason),
      })),
      financeOutcomes: Object.values(SupportTicketFinanceOutcome).map((outcome) => ({
        outcome,
        count: this.findGroupCount(financeOutcomeGroups, 'financeOutcome', outcome),
      })),
      recentTickets: recentTickets.map((ticket) => ({
        id: ticket.id,
        orderId: ticket.orderId,
        reason: ticket.reason,
        status: ticket.status,
        financeOutcome: ticket.financeOutcome,
        createdAt: ticket.createdAt,
        resolvedAt: ticket.resolvedAt,
      })),
    };
  }

  async getHealthSummary(user: AuthenticatedUser) {
    const store = await this.getVendorStoreOrThrow(user);

    return {
      store: {
        ...this.toStoreSummary(store),
        customerRatingAverage: store.customerRatingAverage,
        customerRatingCount: store.customerRatingCount,
        vendorHealthScore: store.vendorHealthScore,
        vendorHealthStatus: store.vendorHealthStatus,
        vendorHealthCalculatedAt: store.vendorHealthCalculatedAt,
        vendorHealthSnapshot: store.vendorHealthSnapshot,
      },
    };
  }

  private async getVendorStoreOrThrow(user: AuthenticatedUser) {
    this.assertVendor(user);

    const store = await this.prisma.store.findFirst({
      where: { ownerId: user.id },
      select: {
        id: true,
        name: true,
        slug: true,
        ownerId: true,
        customerRatingAverage: true,
        customerRatingCount: true,
        vendorHealthScore: true,
        vendorHealthStatus: true,
        vendorHealthCalculatedAt: true,
        vendorHealthSnapshot: true,
      },
    });

    if (!store) {
      throw new NotFoundException('فروشگاهی برای این فروشنده یافت نشد');
    }

    return store;
  }

  private buildRangeResponse(range: ResolvedJalaliDateRange) {
    return {
      period: range.period,
      fromDateJalali: range.fromDateJalali,
      toDateJalali: range.toDateJalali,
      timezone: range.timezone,
    };
  }

  private toStoreSummary(store: { id: number; name: string; slug: string; ownerId: number }) {
    return {
      id: store.id,
      name: store.name,
      slug: store.slug,
      ownerId: store.ownerId,
    };
  }

  private findGroupCount<TGroup extends Record<string, unknown> & { _count: { _all: number } }>(
    groups: TGroup[],
    key: keyof TGroup,
    value: unknown,
  ) {
    return groups.find((item) => item[key] === value)?._count._all ?? 0;
  }

  private roundToTwo(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private assertVendor(user: AuthenticatedUser) {
    if (!user.roles.includes('VENDOR')) {
      throw new ForbiddenException('این endpoint فقط برای فروشنده مجاز است');
    }
  }
}
