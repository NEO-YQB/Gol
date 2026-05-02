import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  Prisma,
  SettlementStatus,
  SupportTicketFinanceOutcome,
  SupportTicketReason,
  SupportTicketStatus,
  VendorHealthStatus,
  WalletTransactionType,
} from '@prisma/client';
import {
  ResolvedJalaliDateRange,
  resolveJalaliDateRange,
} from '../../common/date/jalali-date-range.util';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminReportDateRangeQueryDto } from './dto/admin-report-date-range-query.dto';
import { AdminRiskSummaryQueryDto } from './dto/admin-risk-summary-query.dto';

type AuthenticatedUser = {
  id: number;
  roles: string[];
};

const REFUND_OUTCOMES: SupportTicketFinanceOutcome[] = [
  SupportTicketFinanceOutcome.FULL_REFUND,
  SupportTicketFinanceOutcome.PARTIAL_REFUND,
];

const REVERSAL_OUTCOMES: SupportTicketFinanceOutcome[] = [
  SupportTicketFinanceOutcome.FULL_REVERSAL,
  SupportTicketFinanceOutcome.PARTIAL_REVERSAL,
];

const RISK_STATUS_PRIORITY: Record<VendorHealthStatus, number> = {
  [VendorHealthStatus.AT_RISK]: 0,
  [VendorHealthStatus.WATCHLIST]: 1,
  [VendorHealthStatus.GOOD]: 2,
  [VendorHealthStatus.EXCELLENT]: 3,
};

@Injectable()
export class AdminReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSupportTicketsSummary(user: AuthenticatedUser, query: AdminReportDateRangeQueryDto) {
    this.assertAdmin(user);
    const range = resolveJalaliDateRange(query);
    const createdAtWhere = this.createdAtRange(range);

    const [
      totalCount,
      statusGroups,
      reasonGroups,
      escalatedCount,
      resolvedTickets,
      topStoreGroups,
    ] = await Promise.all([
      this.prisma.supportTicket.count({ where: createdAtWhere }),
      this.prisma.supportTicket.groupBy({
        by: ['status'],
        where: createdAtWhere,
        _count: { _all: true },
      }),
      this.prisma.supportTicket.groupBy({
        by: ['reason'],
        where: createdAtWhere,
        _count: { _all: true },
      }),
      this.prisma.supportTicket.count({
        where: {
          ...createdAtWhere,
          status: SupportTicketStatus.ESCALATED_TO_FINANCE,
        },
      }),
      this.prisma.supportTicket.findMany({
        where: {
          ...createdAtWhere,
          status: SupportTicketStatus.RESOLVED,
          resolvedAt: { not: null },
        },
        select: {
          createdAt: true,
          resolvedAt: true,
        },
      }),
      this.prisma.supportTicket.groupBy({
        by: ['storeId'],
        where: createdAtWhere,
        _count: { _all: true },
        orderBy: {
          _count: {
            storeId: 'desc',
          },
        },
        take: 5,
      }),
    ]);

    const storeIds = topStoreGroups
      .map((item) => item.storeId)
      .filter((storeId): storeId is number => storeId !== null);
    const stores = storeIds.length
      ? await this.prisma.store.findMany({
          where: { id: { in: storeIds } },
          select: { id: true, name: true, slug: true },
        })
      : [];
    const storeMap = new Map(stores.map((store) => [store.id, store]));

    const avgResolutionHours =
      resolvedTickets.length > 0
        ? resolvedTickets.reduce((sum, ticket) => {
            const resolvedAt = ticket.resolvedAt as Date;
            return sum + (resolvedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
          }, 0) / resolvedTickets.length
        : 0;

    return {
      range: this.buildRangeResponse(range),
      totals: {
        all: totalCount,
        ...this.buildEnumCountRecord(Object.values(SupportTicketStatus), statusGroups, 'status'),
      },
      byReason: Object.values(SupportTicketReason).map((reason) => ({
        reason,
        count: this.findGroupCount(reasonGroups, 'reason', reason),
      })),
      financeEscalation: {
        count: escalatedCount,
        rate: totalCount > 0 ? this.roundToTwo((escalatedCount / totalCount) * 100) : 0,
      },
      resolution: {
        resolvedCount: resolvedTickets.length,
        avgResolutionHours: this.roundToTwo(avgResolutionHours),
      },
      topStores: topStoreGroups
        .filter((item) => item.storeId !== null)
        .map((item) => ({
          storeId: item.storeId as number,
          storeName: storeMap.get(item.storeId as number)?.name ?? null,
          storeSlug: storeMap.get(item.storeId as number)?.slug ?? null,
          ticketCount: item._count._all,
        })),
    };
  }

  async getRefundsSummary(user: AuthenticatedUser, query: AdminReportDateRangeQueryDto) {
    this.assertAdmin(user);
    const range = resolveJalaliDateRange(query);
    const where: Prisma.SupportTicketWhereInput = {
      updatedAt: { gte: range.from, lte: range.to },
      financeOutcome: { not: null },
    };

    const [outcomeGroups, topStoreGroups] = await Promise.all([
      this.prisma.supportTicket.groupBy({
        by: ['financeOutcome'],
        where,
        _count: { _all: true },
        _sum: { financeAmount: true },
      }),
      this.prisma.supportTicket.groupBy({
        by: ['storeId'],
        where: {
          ...where,
          financeOutcome: { in: [...REFUND_OUTCOMES, ...REVERSAL_OUTCOMES] },
        },
        _count: { _all: true },
        orderBy: {
          _count: {
            storeId: 'desc',
          },
        },
        take: 5,
      }),
    ]);

    const storeIds = topStoreGroups
      .map((item) => item.storeId)
      .filter((storeId): storeId is number => storeId !== null);
    const stores = storeIds.length
      ? await this.prisma.store.findMany({
          where: { id: { in: storeIds } },
          select: { id: true, name: true, slug: true },
        })
      : [];
    const storeMap = new Map(stores.map((store) => [store.id, store]));

    const countByOutcome = (outcome: SupportTicketFinanceOutcome) =>
      this.findGroupCount(outcomeGroups, 'financeOutcome', outcome);
    const amountByOutcome = (outcome: SupportTicketFinanceOutcome) =>
      this.findGroupAmount(outcomeGroups, 'financeOutcome', outcome, '_sum', 'financeAmount');

    return {
      range: this.buildRangeResponse(range),
      totals: {
        refundCount: REFUND_OUTCOMES.reduce((sum, outcome) => sum + countByOutcome(outcome), 0),
        reversalCount: REVERSAL_OUTCOMES.reduce((sum, outcome) => sum + countByOutcome(outcome), 0),
        partialRefundCount: countByOutcome(SupportTicketFinanceOutcome.PARTIAL_REFUND),
        partialReversalCount: countByOutcome(SupportTicketFinanceOutcome.PARTIAL_REVERSAL),
        fullRefundCount: countByOutcome(SupportTicketFinanceOutcome.FULL_REFUND),
        fullReversalCount: countByOutcome(SupportTicketFinanceOutcome.FULL_REVERSAL),
        extendHoldCount: countByOutcome(SupportTicketFinanceOutcome.EXTEND_HOLD),
        noActionReleaseCount: countByOutcome(SupportTicketFinanceOutcome.NO_ACTION_RELEASE),
      },
      amounts: {
        partialRefundAmount: amountByOutcome(SupportTicketFinanceOutcome.PARTIAL_REFUND),
        partialReversalAmount: amountByOutcome(SupportTicketFinanceOutcome.PARTIAL_REVERSAL),
        knownFinanceAmountTotal: outcomeGroups.reduce(
          (sum, item) => sum + Number(item._sum.financeAmount ?? 0),
          0,
        ),
      },
      byOutcome: Object.values(SupportTicketFinanceOutcome).map((outcome) => ({
        outcome,
        count: countByOutcome(outcome),
        amount: amountByOutcome(outcome),
      })),
      topStores: topStoreGroups
        .filter((item) => item.storeId !== null)
        .map((item) => ({
          storeId: item.storeId as number,
          storeName: storeMap.get(item.storeId as number)?.name ?? null,
          storeSlug: storeMap.get(item.storeId as number)?.slug ?? null,
          refundOrReversalCount: item._count._all,
        })),
    };
  }

  async getWalletsSettlementsSummary(user: AuthenticatedUser, query: AdminReportDateRangeQueryDto) {
    this.assertAdmin(user);
    const range = resolveJalaliDateRange(query);

    const [walletAgg, walletCount, transactionGroups, settlementGroups] = await Promise.all([
      this.prisma.storeWallet.aggregate({
        _sum: {
          currentBalance: true,
          availableBalance: true,
          heldBalance: true,
        },
      }),
      this.prisma.storeWallet.count(),
      this.prisma.walletTransaction.groupBy({
        by: ['type', 'direction'],
        where: {
          createdAt: { gte: range.from, lte: range.to },
        },
        _count: { _all: true },
        _sum: { amount: true },
      }),
      this.prisma.order.groupBy({
        by: ['settlementStatus'],
        where: {
          updatedAt: { gte: range.from, lte: range.to },
        },
        _count: { _all: true },
      }),
    ]);

    const creditAmount = transactionGroups
      .filter((item) => item.direction === 'CREDIT')
      .reduce((sum, item) => sum + Number(item._sum.amount ?? 0), 0);
    const debitAmount = transactionGroups
      .filter((item) => item.direction === 'DEBIT')
      .reduce((sum, item) => sum + Number(item._sum.amount ?? 0), 0);

    return {
      range: this.buildRangeResponse(range),
      wallets: {
        storeCount: walletCount,
        currentBalanceTotal: Number(walletAgg._sum.currentBalance ?? 0),
        availableBalanceTotal: Number(walletAgg._sum.availableBalance ?? 0),
        heldBalanceTotal: Number(walletAgg._sum.heldBalance ?? 0),
      },
      transactions: {
        creditAmount,
        debitAmount,
        byType: Object.values(WalletTransactionType).map((type) => {
          const entries = transactionGroups.filter((item) => item.type === type);
          return {
            type,
            count: entries.reduce((sum, item) => sum + item._count._all, 0),
            amount: entries.reduce((sum, item) => sum + Number(item._sum.amount ?? 0), 0),
          };
        }),
      },
      settlements: this.toCamelSettlementCounts(settlementGroups),
    };
  }

  async getVendorRiskSummary(user: AuthenticatedUser, query: AdminRiskSummaryQueryDto) {
    this.assertAdmin(user);
    const range = resolveJalaliDateRange(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const stores = await this.prisma.store.findMany({
      where: {
        ...(query.status ? { vendorHealthStatus: query.status } : {}),
      },
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
      },
    });

    const storeIds = stores.map((store) => store.id);
    const tickets = storeIds.length
      ? await this.prisma.supportTicket.findMany({
          where: {
            storeId: { in: storeIds },
            createdAt: { gte: range.from, lte: range.to },
          },
          select: {
            storeId: true,
            status: true,
            financeOutcome: true,
          },
        })
      : [];

    const metricMap = new Map<
      number,
      {
        ticketCount: number;
        escalatedCount: number;
        refundCount: number;
        reversalCount: number;
        resolvedCount: number;
      }
    >();

    for (const ticket of tickets) {
      if (!ticket.storeId) {
        continue;
      }

      const current =
        metricMap.get(ticket.storeId) ?? {
          ticketCount: 0,
          escalatedCount: 0,
          refundCount: 0,
          reversalCount: 0,
          resolvedCount: 0,
        };

      current.ticketCount += 1;
      if (ticket.status === SupportTicketStatus.ESCALATED_TO_FINANCE) {
        current.escalatedCount += 1;
      }
      if (ticket.status === SupportTicketStatus.RESOLVED) {
        current.resolvedCount += 1;
      }
      if (ticket.financeOutcome && REFUND_OUTCOMES.includes(ticket.financeOutcome)) {
        current.refundCount += 1;
      }
      if (ticket.financeOutcome && REVERSAL_OUTCOMES.includes(ticket.financeOutcome)) {
        current.reversalCount += 1;
      }

      metricMap.set(ticket.storeId, current);
    }

    const sorted = stores
      .map((store) => ({
        ...store,
        periodMetrics:
          metricMap.get(store.id) ?? {
            ticketCount: 0,
            escalatedCount: 0,
            refundCount: 0,
            reversalCount: 0,
            resolvedCount: 0,
          },
      }))
      .sort((left, right) => {
        const leftStatus = left.vendorHealthStatus ?? VendorHealthStatus.EXCELLENT;
        const rightStatus = right.vendorHealthStatus ?? VendorHealthStatus.EXCELLENT;
        const statusDiff = RISK_STATUS_PRIORITY[leftStatus] - RISK_STATUS_PRIORITY[rightStatus];

        if (statusDiff !== 0) {
          return statusDiff;
        }

        const scoreDiff = (left.vendorHealthScore ?? 999) - (right.vendorHealthScore ?? 999);
        if (scoreDiff !== 0) {
          return scoreDiff;
        }

        const ticketDiff = right.periodMetrics.ticketCount - left.periodMetrics.ticketCount;
        if (ticketDiff !== 0) {
          return ticketDiff;
        }

        return right.id - left.id;
      });

    const total = sorted.length;
    const paged = sorted.slice((page - 1) * limit, page * limit);

    return {
      range: this.buildRangeResponse(range),
      data: paged.map((store) => ({
        storeId: store.id,
        storeName: store.name,
        storeSlug: store.slug,
        ownerId: store.ownerId,
        vendorHealthScore: store.vendorHealthScore,
        vendorHealthStatus: store.vendorHealthStatus,
        customerRatingAverage: store.customerRatingAverage,
        customerRatingCount: store.customerRatingCount,
        vendorHealthCalculatedAt: store.vendorHealthCalculatedAt,
        periodMetrics: store.periodMetrics,
      })),
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  private buildRangeResponse(range: ResolvedJalaliDateRange) {
    return {
      period: range.period,
      fromDateJalali: range.fromDateJalali,
      toDateJalali: range.toDateJalali,
      timezone: range.timezone,
    };
  }

  private createdAtRange(range: ResolvedJalaliDateRange): Prisma.SupportTicketWhereInput {
    return {
      createdAt: { gte: range.from, lte: range.to },
    };
  }

  private buildEnumCountRecord<
    TKey extends string,
    TGroup extends Record<string, unknown> & { _count: { _all: number } },
  >(values: TKey[], groups: TGroup[], key: keyof TGroup) {
    return values.reduce<Record<string, number>>((accumulator, value) => {
      accumulator[this.toCamelCase(value)] = this.findGroupCount(groups, key, value);
      return accumulator;
    }, {});
  }

  private toCamelSettlementCounts(groups: Array<{ settlementStatus: SettlementStatus; _count: { _all: number } }>) {
    return {
      pending: this.findGroupCount(groups, 'settlementStatus', SettlementStatus.PENDING),
      eligible: this.findGroupCount(groups, 'settlementStatus', SettlementStatus.ELIGIBLE),
      processing: this.findGroupCount(groups, 'settlementStatus', SettlementStatus.PROCESSING),
      settled: this.findGroupCount(groups, 'settlementStatus', SettlementStatus.SETTLED),
      onHold: this.findGroupCount(groups, 'settlementStatus', SettlementStatus.ON_HOLD),
      reversed: this.findGroupCount(groups, 'settlementStatus', SettlementStatus.REVERSED),
    };
  }

  private findGroupCount<TGroup extends Record<string, unknown> & { _count: { _all: number } }>(
    groups: TGroup[],
    key: keyof TGroup,
    value: unknown,
  ) {
    return groups.find((item) => item[key] === value)?._count._all ?? 0;
  }

  private findGroupAmount<
    TGroup extends Record<string, unknown> & { _sum: Record<string, Prisma.Decimal | number | null> },
  >(
    groups: TGroup[],
    key: keyof TGroup,
    value: unknown,
    sumKey: keyof TGroup,
    amountField: string,
  ) {
    const matched = groups.find((item) => item[key] === value);
    if (!matched) {
      return 0;
    }

    const sum = matched[sumKey] as Record<string, Prisma.Decimal | number | null>;
    return Number(sum[amountField] ?? 0);
  }

  private toCamelCase(value: string) {
    return value
      .toLowerCase()
      .split('_')
      .map((segment, index) =>
        index === 0 ? segment : `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`,
      )
      .join('');
  }

  private roundToTwo(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private assertAdmin(user: AuthenticatedUser) {
    if (!user.roles.includes('ADMIN')) {
      throw new ForbiddenException('این endpoint فقط برای ادمین مجاز است');
    }
  }
}
