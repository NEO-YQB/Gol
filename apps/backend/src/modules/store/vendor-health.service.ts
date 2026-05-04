import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  SupportTicketFinanceOutcome,
  SupportTicketStatus,
  VendorHealthStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminListVendorHealthQueryDto } from './dto/admin-list-vendor-health-query.dto';
import { AdminUpsertVendorRiskPolicyDto } from './dto/admin-upsert-vendor-risk-policy.dto';

type AuthenticatedUser = {
  id: number;
  roles: string[];
};

type DerivedRiskPolicy = {
  autoSettlementHoldEnabled: boolean;
  settlementHoldDaysOverride: number | null;
  manualReviewRequired: boolean;
  blockNewDiscounts: boolean;
  source: 'AUTO' | 'MANUAL_OVERRIDE';
  note: string;
};

@Injectable()
export class VendorHealthService {
  constructor(private readonly prisma: PrismaService) {}

  async recalculateStoreHealth(storeId: number) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        name: true,
        slug: true,
        ownerId: true,
        vendorHealthSnapshot: true,
      },
    });

    if (!store) {
      throw new NotFoundException('فروشگاه مورد نظر یافت نشد');
    }

    const [reviewAgg, totalTickets, resolvedTickets, refundTickets, reversalTickets] =
      await Promise.all([
        this.prisma.review.aggregate({
          where: { product: { storeId } },
          _avg: { rating: true },
          _count: { rating: true },
        }),
        this.prisma.supportTicket.count({
          where: { storeId },
        }),
        this.prisma.supportTicket.count({
          where: {
            storeId,
            status: SupportTicketStatus.RESOLVED,
          },
        }),
        this.prisma.supportTicket.count({
          where: {
            storeId,
            financeOutcome: {
              in: [
                SupportTicketFinanceOutcome.FULL_REFUND,
                SupportTicketFinanceOutcome.PARTIAL_REFUND,
              ],
            },
          },
        }),
        this.prisma.supportTicket.count({
          where: {
            storeId,
            financeOutcome: {
              in: [
                SupportTicketFinanceOutcome.FULL_REVERSAL,
                SupportTicketFinanceOutcome.PARTIAL_REVERSAL,
              ],
            },
          },
        }),
      ]);

    const ratingAverage = Number(reviewAgg._avg.rating ?? 0);
    const ratingCount = reviewAgg._count.rating ?? 0;
    const ratingPenalty = ratingCount > 0 ? Math.max(0, (5 - ratingAverage) * 8) : 10;
    const ticketPenalty = totalTickets * 2;
    const unresolvedPenalty = Math.max(0, totalTickets - resolvedTickets) * 3;
    const refundPenalty = refundTickets * 6;
    const reversalPenalty = reversalTickets * 8;

    const rawScore = 100 - ratingPenalty - ticketPenalty - unresolvedPenalty - refundPenalty - reversalPenalty;
    const vendorHealthScore = Math.max(0, Math.min(100, Math.round(rawScore)));

    const vendorHealthStatus =
      vendorHealthScore >= 90
        ? VendorHealthStatus.EXCELLENT
        : vendorHealthScore >= 75
          ? VendorHealthStatus.GOOD
          : vendorHealthScore >= 50
            ? VendorHealthStatus.WATCHLIST
            : VendorHealthStatus.AT_RISK;

    const existingSnapshot = this.asObject(store.vendorHealthSnapshot);
    const manualRiskPolicy = this.asObject(existingSnapshot.riskPolicyManualOverride);
    const derivedRiskPolicy = this.buildDerivedRiskPolicy(vendorHealthStatus, vendorHealthScore);
    const effectiveRiskPolicy = this.mergeRiskPolicy(derivedRiskPolicy, manualRiskPolicy);

    return this.prisma.store.update({
      where: { id: storeId },
      data: {
        customerRatingAverage: this.toDecimal(ratingAverage),
        customerRatingCount: ratingCount,
        vendorHealthScore,
        vendorHealthStatus,
        vendorHealthCalculatedAt: new Date(),
        vendorHealthSnapshot: {
          metrics: {
            ratingAverage,
            ratingCount,
            totalTickets,
            resolvedTickets,
            refundTickets,
            reversalTickets,
          },
          penalties: {
            ratingPenalty,
            ticketPenalty,
            unresolvedPenalty,
            refundPenalty,
            reversalPenalty,
          },
          final: {
            vendorHealthScore,
            vendorHealthStatus,
          },
          riskPolicyAuto: derivedRiskPolicy,
          riskPolicyManualOverride: Object.keys(manualRiskPolicy).length > 0 ? manualRiskPolicy : null,
          riskPolicyEffective: effectiveRiskPolicy,
        } as Prisma.InputJsonValue,
      },
      select: this.vendorHealthSelect(),
    });
  }

  async adminListVendorHealth(user: AuthenticatedUser, query: AdminListVendorHealthQueryDto) {
    this.assertAdmin(user);
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.StoreWhereInput = {
      ...(status ? { vendorHealthStatus: status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.store.findMany({
        where,
        skip,
        take: limit,
        select: this.vendorHealthListSelect(),
        orderBy: [{ vendorHealthScore: 'asc' }, { id: 'desc' }],
      }),
      this.prisma.store.count({ where }),
    ]);

    return {
      data: items.map((item) => ({
        ...item,
        riskPolicy: this.extractRiskPolicyView(item.vendorHealthSnapshot),
      })),
      meta: { total, page, lastPage: Math.ceil(total / limit) },
    };
  }

  async adminGetVendorHealth(user: AuthenticatedUser, storeId: number) {
    this.assertAdmin(user);

    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: this.vendorHealthSelect(),
    });

    if (!store) {
      throw new NotFoundException('فروشگاه مورد نظر یافت نشد');
    }

    return {
      ...store,
      riskPolicy: this.extractRiskPolicyView(store.vendorHealthSnapshot),
    };
  }

  async adminRecalculateVendorHealth(user: AuthenticatedUser, storeId: number) {
    this.assertAdmin(user);
    return this.recalculateStoreHealth(storeId);
  }

  async adminUpsertVendorRiskPolicy(
    user: AuthenticatedUser,
    storeId: number,
    dto: AdminUpsertVendorRiskPolicyDto,
  ) {
    this.assertAdmin(user);

    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        name: true,
        slug: true,
        vendorHealthScore: true,
        vendorHealthStatus: true,
        vendorHealthSnapshot: true,
      },
    });

    if (!store) {
      throw new NotFoundException('فروشگاه مورد نظر یافت نشد');
    }

    const snapshot = this.asObject(store.vendorHealthSnapshot);
    const currentAutoPolicy = this.asObject(snapshot.riskPolicyAuto);
    const manualOverride = {
      ...(dto.autoSettlementHoldEnabled !== undefined
        ? { autoSettlementHoldEnabled: dto.autoSettlementHoldEnabled }
        : {}),
      ...(dto.settlementHoldDaysOverride !== undefined
        ? { settlementHoldDaysOverride: dto.settlementHoldDaysOverride }
        : {}),
      ...(dto.manualReviewRequired !== undefined
        ? { manualReviewRequired: dto.manualReviewRequired }
        : {}),
      ...(dto.blockNewDiscounts !== undefined
        ? { blockNewDiscounts: dto.blockNewDiscounts }
        : {}),
      ...(dto.note !== undefined ? { note: dto.note } : {}),
      ...(dto.metadata !== undefined ? { metadata: dto.metadata } : {}),
      updatedAt: new Date().toISOString(),
      updatedByUserId: user.id,
    };

    const effectiveRiskPolicy = this.mergeRiskPolicy(
      this.buildDerivedRiskPolicy(store.vendorHealthStatus, store.vendorHealthScore),
      manualOverride,
    );

    const updated = await this.prisma.store.update({
      where: { id: storeId },
      data: {
        vendorHealthSnapshot: {
          ...snapshot,
          riskPolicyAuto: Object.keys(currentAutoPolicy).length > 0
            ? currentAutoPolicy
            : this.buildDerivedRiskPolicy(store.vendorHealthStatus, store.vendorHealthScore),
          riskPolicyManualOverride: manualOverride,
          riskPolicyEffective: effectiveRiskPolicy,
        } as Prisma.InputJsonValue,
      },
      select: this.vendorHealthSelect(),
    });

    return {
      message: 'risk policy فروشنده به روز شد',
      store: {
        ...updated,
        riskPolicy: this.extractRiskPolicyView(updated.vendorHealthSnapshot),
      },
    };
  }

  getEffectiveRiskPolicyFromSnapshot(snapshot: Prisma.JsonValue | null): DerivedRiskPolicy {
    const source = this.asObject(snapshot);
    const effective = this.asObject(source.riskPolicyEffective);

    return {
      autoSettlementHoldEnabled: Boolean(effective.autoSettlementHoldEnabled),
      settlementHoldDaysOverride:
        typeof effective.settlementHoldDaysOverride === 'number'
          ? effective.settlementHoldDaysOverride
          : null,
      manualReviewRequired: Boolean(effective.manualReviewRequired),
      blockNewDiscounts: Boolean(effective.blockNewDiscounts),
      source: effective.source === 'MANUAL_OVERRIDE' ? 'MANUAL_OVERRIDE' : 'AUTO',
      note: typeof effective.note === 'string' ? effective.note : '',
    };
  }

  private extractRiskPolicyView(snapshot: Prisma.JsonValue | null) {
    const source = this.asObject(snapshot);
    return {
      auto: this.asObject(source.riskPolicyAuto),
      manualOverride: this.asObject(source.riskPolicyManualOverride),
      effective: this.asObject(source.riskPolicyEffective),
    };
  }

  private buildDerivedRiskPolicy(
    status: VendorHealthStatus,
    score: number,
  ): DerivedRiskPolicy {
    if (status === VendorHealthStatus.AT_RISK) {
      return {
        autoSettlementHoldEnabled: true,
        settlementHoldDaysOverride: 14,
        manualReviewRequired: true,
        blockNewDiscounts: true,
        source: 'AUTO',
        note: 'health score فروشنده در سطح پرريسك است و policy سخت گيرانه اعمال شد',
      };
    }

    if (status === VendorHealthStatus.WATCHLIST) {
      return {
        autoSettlementHoldEnabled: true,
        settlementHoldDaysOverride: score < 60 ? 10 : 7,
        manualReviewRequired: false,
        blockNewDiscounts: false,
        source: 'AUTO',
        note: 'فروشنده در watchlist قرار دارد و settlement hold محافظه کارانه اعمال مي شود',
      };
    }

    return {
      autoSettlementHoldEnabled: false,
      settlementHoldDaysOverride: null,
      manualReviewRequired: false,
      blockNewDiscounts: false,
      source: 'AUTO',
      note: 'policy خودکار محدودکننده اي براي فروشنده لازم نيست',
    };
  }

  private mergeRiskPolicy(autoPolicy: DerivedRiskPolicy, manualOverride: Record<string, unknown>) {
    const hasOverride = Object.keys(manualOverride).some((key) =>
      [
        'autoSettlementHoldEnabled',
        'settlementHoldDaysOverride',
        'manualReviewRequired',
        'blockNewDiscounts',
        'note',
      ].includes(key),
    );

    if (!hasOverride) {
      return autoPolicy;
    }

    return {
      autoSettlementHoldEnabled:
        typeof manualOverride.autoSettlementHoldEnabled === 'boolean'
          ? manualOverride.autoSettlementHoldEnabled
          : autoPolicy.autoSettlementHoldEnabled,
      settlementHoldDaysOverride:
        typeof manualOverride.settlementHoldDaysOverride === 'number'
          ? manualOverride.settlementHoldDaysOverride
          : autoPolicy.settlementHoldDaysOverride,
      manualReviewRequired:
        typeof manualOverride.manualReviewRequired === 'boolean'
          ? manualOverride.manualReviewRequired
          : autoPolicy.manualReviewRequired,
      blockNewDiscounts:
        typeof manualOverride.blockNewDiscounts === 'boolean'
          ? manualOverride.blockNewDiscounts
          : autoPolicy.blockNewDiscounts,
      source: 'MANUAL_OVERRIDE' as const,
      note:
        typeof manualOverride.note === 'string' && manualOverride.note.length > 0
          ? manualOverride.note
          : autoPolicy.note,
    };
  }

  private vendorHealthListSelect() {
    return {
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
    } as const;
  }

  private vendorHealthSelect() {
    return {
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
    } as const;
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

  private toDecimal(value: number) {
    return new Prisma.Decimal(
      Math.round((value + Number.EPSILON) * 100) / 100,
    );
  }
}
