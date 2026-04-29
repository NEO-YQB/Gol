import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  Prisma,
  SettlementStatus,
  SupportTicketActorType,
  SupportTicketFinanceOutcome,
  SupportTicketStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminListSupportTicketsQueryDto } from './dto/admin-list-support-tickets-query.dto';
import { CreateSupportTicketNoteDto } from './dto/create-support-ticket-note.dto';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { SupportFinanceDecisionDto } from './dto/support-finance-decision.dto';
import { UpdateSupportTicketStatusDto } from './dto/update-support-ticket-status.dto';

type AuthenticatedUser = {
  id: number;
  roles: string[];
};

const SUPPORT_TX_OPTIONS = {
  maxWait: 10_000,
  timeout: 15_000,
} as const;

const ACTIVE_TICKET_STATUSES: SupportTicketStatus[] = [
  SupportTicketStatus.OPEN,
  SupportTicketStatus.IN_REVIEW,
  SupportTicketStatus.WAITING_CUSTOMER,
  SupportTicketStatus.WAITING_VENDOR,
  SupportTicketStatus.ESCALATED_TO_FINANCE,
];

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async customerCreateOrderTicket(
    user: AuthenticatedUser,
    orderId: number,
    dto: CreateSupportTicketDto,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        storeId: true,
        status: true,
        deliveredAt: true,
        complaintWindowHours: true,
        settlementStatus: true,
      },
    });

    if (!order) {
      throw new NotFoundException('سفارش یافت نشد');
    }

    if (order.userId !== user.id) {
      throw new ForbiddenException('شما فقط برای سفارش خودتان می‌توانید تیکت ثبت کنید');
    }

    if (order.status !== OrderStatus.DELIVERED || !order.deliveredAt) {
      throw new BadRequestException('ثبت شکایت فقط بعد از تحویل سفارش امکان‌پذیر است');
    }

    const complaintDeadline = new Date(
      order.deliveredAt.getTime() + order.complaintWindowHours * 60 * 60 * 1000,
    );

    if (complaintDeadline.getTime() < Date.now()) {
      throw new ConflictException('مهلت ثبت شکایت برای این سفارش به پایان رسیده است');
    }

    if (order.settlementStatus === SettlementStatus.SETTLED) {
      throw new ConflictException('settlement این سفارش قبلا آزاد شده و نیاز به بررسی ادمین دارد');
    }

    const existingActiveTicket = await this.prisma.supportTicket.findFirst({
      where: {
        orderId: order.id,
        status: { in: ACTIVE_TICKET_STATUSES },
      },
      select: { id: true },
    });

    if (existingActiveTicket) {
      throw new ConflictException('برای این سفارش یک تیکت فعال وجود دارد');
    }

    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.supportTicket.create({
        data: {
          orderId: order.id,
          customerId: user.id,
          storeId: order.storeId,
          reason: dto.reason,
          title: dto.title,
          description: dto.description,
          customerEvidence: this.toInputJson(dto.customerEvidence),
          settlementBlockedAt: new Date(),
          notes: {
            create: {
              actorType: SupportTicketActorType.CUSTOMER,
              actorUserId: user.id,
              message: dto.description,
              isInternal: false,
              metadata: {
                reason: dto.reason,
                title: dto.title,
                evidence: dto.customerEvidence ?? null,
              } as Prisma.InputJsonValue,
            },
          },
        },
        include: this.ticketInclude(false),
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          settlementStatus: SettlementStatus.ON_HOLD,
          settlementAutoReleaseEnabled: false,
          settlementReviewedAt: new Date(),
          settlementReviewedByUserId: user.id,
        },
      });

      return ticket;
    }, SUPPORT_TX_OPTIONS);
  }

  async customerListMyTickets(user: AuthenticatedUser) {
    return this.prisma.supportTicket.findMany({
      where: { customerId: user.id },
      include: this.ticketInclude(false),
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTicket(user: AuthenticatedUser, id: number) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: this.ticketInclude(this.isAdmin(user)),
    });

    if (!ticket) {
      throw new NotFoundException('تیکت یافت نشد');
    }

    if (this.isAdmin(user)) {
      return ticket;
    }

    if (ticket.customerId === user.id) {
      return ticket;
    }

    if (this.isVendor(user) && ticket.store?.ownerId === user.id) {
      return ticket;
    }

    throw new ForbiddenException('شما اجازه مشاهده این تیکت را ندارید');
  }

  async adminListTickets(user: AuthenticatedUser, query: AdminListSupportTicketsQueryDto) {
    this.assertAdmin(user);
    const { page = 1, limit = 10, status, reason, orderId, storeId, customerId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SupportTicketWhereInput = {
      ...(status ? { status } : {}),
      ...(reason ? { reason } : {}),
      ...(orderId ? { orderId } : {}),
      ...(storeId ? { storeId } : {}),
      ...(customerId ? { customerId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        include: this.ticketInclude(true),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return {
      data: items,
      meta: { total, page, lastPage: Math.ceil(total / limit) },
    };
  }

  async adminUpdateStatus(
    user: AuthenticatedUser,
    id: number,
    dto: UpdateSupportTicketStatusDto,
  ) {
    this.assertAdmin(user);
    const ticket = await this.getTicketOrThrow(id);
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.supportTicket.update({
        where: { id },
        data: {
          status: dto.status,
          internalNote: dto.internalNote ?? ticket.internalNote,
          escalatedAt:
            dto.status === SupportTicketStatus.ESCALATED_TO_FINANCE
              ? ticket.escalatedAt ?? now
              : ticket.escalatedAt,
          resolvedAt: this.isFinalStatus(dto.status) ? ticket.resolvedAt ?? now : ticket.resolvedAt,
          resolvedByUserId: this.isFinalStatus(dto.status)
            ? ticket.resolvedByUserId ?? user.id
            : ticket.resolvedByUserId,
        },
        include: this.ticketInclude(true),
      });

      await tx.supportTicketNote.create({
        data: {
          ticketId: id,
          actorType: SupportTicketActorType.ADMIN,
          actorUserId: user.id,
          message: dto.note ?? `وضعیت تیکت به ${dto.status} تغییر کرد`,
          isInternal: true,
          metadata: {
            fromStatus: ticket.status,
            toStatus: dto.status,
            internalNote: dto.internalNote ?? null,
          } as Prisma.InputJsonValue,
        },
      });

      return updated;
    }, SUPPORT_TX_OPTIONS);
  }

  async addTicketNote(
    user: AuthenticatedUser,
    id: number,
    dto: CreateSupportTicketNoteDto,
  ) {
    const ticket = await this.getTicket(user, id);
    const isInternal = this.isAdmin(user) ? dto.isInternal ?? false : false;

    if (!this.isAdmin(user) && ticket.status === SupportTicketStatus.CANCELLED) {
      throw new ConflictException('امکان ثبت پیام روی تیکت لغو شده وجود ندارد');
    }

    return this.prisma.supportTicketNote.create({
      data: {
        ticketId: id,
        actorType: this.resolveActorType(user),
        actorUserId: user.id,
        message: dto.message,
        isInternal,
      },
    });
  }

  async adminApplyFinanceDecision(
    user: AuthenticatedUser,
    id: number,
    dto: SupportFinanceDecisionDto,
  ) {
    this.assertAdmin(user);
    const ticket = await this.getTicketOrThrow(id);

    if (ticket.status !== SupportTicketStatus.ESCALATED_TO_FINANCE) {
      throw new ConflictException('فقط تیکت escalate شده به مالی قابل تصمیم مالی است');
    }

    const partialOutcomes: SupportTicketFinanceOutcome[] = [
      SupportTicketFinanceOutcome.PARTIAL_REFUND,
      SupportTicketFinanceOutcome.PARTIAL_REVERSAL,
    ];

    if (partialOutcomes.includes(dto.outcome) && (dto.amount === undefined || dto.amount <= 0)) {
      throw new BadRequestException('برای تصمیم partial مقدار amount اجباری است');
    }

    if (dto.outcome === SupportTicketFinanceOutcome.EXTEND_HOLD && !dto.extendHoldDays) {
      throw new BadRequestException('برای EXTEND_HOLD مقدار extendHoldDays اجباری است');
    }

    const now = new Date();
    const orderUpdate = this.buildOrderUpdateForFinanceDecision(dto, now, user.id);

    return this.prisma.$transaction(async (tx) => {
      const updatedTicket = await tx.supportTicket.update({
        where: { id },
        data: {
          status:
            dto.outcome === SupportTicketFinanceOutcome.EXTEND_HOLD
              ? SupportTicketStatus.IN_REVIEW
              : SupportTicketStatus.RESOLVED,
          financeOutcome: dto.outcome,
          financeAmount: dto.amount,
          financeNote: dto.note,
          resolvedAt:
            dto.outcome === SupportTicketFinanceOutcome.EXTEND_HOLD ? null : now,
          resolvedByUserId:
            dto.outcome === SupportTicketFinanceOutcome.EXTEND_HOLD ? null : user.id,
        },
        include: this.ticketInclude(true),
      });

      await tx.order.update({
        where: { id: ticket.orderId },
        data: orderUpdate,
      });

      await tx.supportTicketNote.create({
        data: {
          ticketId: id,
          actorType: SupportTicketActorType.FINANCE,
          actorUserId: user.id,
          message: dto.note ?? `تصمیم مالی ${dto.outcome} ثبت شد`,
          isInternal: true,
          metadata: {
            outcome: dto.outcome,
            amount: dto.amount ?? null,
            extendHoldDays: dto.extendHoldDays ?? null,
          } as Prisma.InputJsonValue,
        },
      });

      return updatedTicket;
    }, SUPPORT_TX_OPTIONS);
  }

  private buildOrderUpdateForFinanceDecision(
    dto: SupportFinanceDecisionDto,
    now: Date,
    actorUserId: number,
  ): Prisma.OrderUpdateInput {
    if (dto.outcome === SupportTicketFinanceOutcome.NO_ACTION_RELEASE) {
      return {
        settlementAutoReleaseEnabled: true,
        settlementReviewedAt: now,
        settlementReviewedByUserId: actorUserId,
      };
    }

    if (dto.outcome === SupportTicketFinanceOutcome.EXTEND_HOLD) {
      return {
        settlementStatus: SettlementStatus.ON_HOLD,
        settlementAutoReleaseEnabled: false,
        settlementEligibleAt: new Date(
          now.getTime() + (dto.extendHoldDays ?? 1) * 24 * 60 * 60 * 1000,
        ),
        settlementReviewedAt: now,
        settlementReviewedByUserId: actorUserId,
      };
    }

    const blockedSettlementOutcomes: SupportTicketFinanceOutcome[] = [
      SupportTicketFinanceOutcome.FULL_REFUND,
      SupportTicketFinanceOutcome.FULL_REVERSAL,
      SupportTicketFinanceOutcome.PARTIAL_REFUND,
      SupportTicketFinanceOutcome.PARTIAL_REVERSAL,
    ];

    if (blockedSettlementOutcomes.includes(dto.outcome)) {
      return {
        settlementStatus: SettlementStatus.ON_HOLD,
        settlementAutoReleaseEnabled: false,
        settlementReviewedAt: now,
        settlementReviewedByUserId: actorUserId,
      };
    }

    return { settlementReviewedAt: now, settlementReviewedByUserId: actorUserId };
  }

  private async getTicketOrThrow(id: number) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: this.ticketInclude(true),
    });

    if (!ticket) {
      throw new NotFoundException('تیکت یافت نشد');
    }

    return ticket;
  }

  private ticketInclude(includeInternalNotes: boolean) {
    return {
      order: {
        select: {
          id: true,
          status: true,
          paymentStatus: true,
          settlementStatus: true,
          settlementAutoReleaseEnabled: true,
          settlementEligibleAt: true,
          deliveredAt: true,
          totalAmount: true,
          vendorShareAmount: true,
        },
      },
      customer: {
        select: { id: true, phoneNumber: true, fullName: true },
      },
      store: {
        select: { id: true, name: true, slug: true, ownerId: true },
      },
      notes: {
        where: includeInternalNotes ? {} : { isInternal: false },
        orderBy: { createdAt: 'asc' as const },
      },
    } satisfies Prisma.SupportTicketInclude;
  }

  private resolveActorType(user: AuthenticatedUser) {
    if (this.isAdmin(user)) {
      return SupportTicketActorType.ADMIN;
    }

    if (this.isVendor(user)) {
      return SupportTicketActorType.VENDOR;
    }

    return SupportTicketActorType.CUSTOMER;
  }

  private isFinalStatus(status: SupportTicketStatus) {
    const finalStatuses: SupportTicketStatus[] = [
      SupportTicketStatus.RESOLVED,
      SupportTicketStatus.REJECTED,
      SupportTicketStatus.CANCELLED,
    ];

    return finalStatuses.includes(status);
  }

  private assertAdmin(user: AuthenticatedUser) {
    if (!this.isAdmin(user)) {
      throw new ForbiddenException('این endpoint فقط برای ادمین مجاز است');
    }
  }

  private isAdmin(user: AuthenticatedUser) {
    return user.roles.includes('ADMIN');
  }

  private isVendor(user: AuthenticatedUser) {
    return user.roles.includes('VENDOR');
  }

  private toInputJson(value: Record<string, unknown> | undefined) {
    if (value === undefined) {
      return undefined;
    }

    return value as Prisma.InputJsonValue;
  }
}
