import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  OrderStatus,
  PaymentMethod,
  PaymentReviewStatus,
  PaymentStatus,
  SettlementStatus,
  SupportTicketStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

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

  private assertAdmin(user: AuthenticatedUser) {
    if (!user.roles.includes('ADMIN')) {
      throw new ForbiddenException('این endpoint فقط برای ادمین مجاز است');
    }
  }
}
