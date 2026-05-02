import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SupportTicketFinanceOutcome, SupportTicketStatus, VendorHealthStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminListVendorHealthQueryDto } from './dto/admin-list-vendor-health-query.dto';

type AuthenticatedUser = {
  id: number;
  roles: string[];
};

@Injectable()
export class VendorHealthService {
  constructor(private readonly prisma: PrismaService) {}

  async recalculateStoreHealth(storeId: number) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, name: true, slug: true, ownerId: true },
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
        } as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        customerRatingAverage: true,
        customerRatingCount: true,
        vendorHealthScore: true,
        vendorHealthStatus: true,
        vendorHealthCalculatedAt: true,
        vendorHealthSnapshot: true,
      },
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
        orderBy: [{ vendorHealthScore: 'asc' }, { id: 'desc' }],
      }),
      this.prisma.store.count({ where }),
    ]);

    return {
      data: items,
      meta: { total, page, lastPage: Math.ceil(total / limit) },
    };
  }

  async adminGetVendorHealth(user: AuthenticatedUser, storeId: number) {
    this.assertAdmin(user);

    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
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
      throw new NotFoundException('فروشگاه مورد نظر یافت نشد');
    }

    return store;
  }

  async adminRecalculateVendorHealth(user: AuthenticatedUser, storeId: number) {
    this.assertAdmin(user);
    return this.recalculateStoreHealth(storeId);
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
