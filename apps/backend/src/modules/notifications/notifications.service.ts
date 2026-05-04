import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationStatus,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminListNotificationsQueryDto } from './dto/admin-list-notifications-query.dto';
import { MarkNotificationStatusDto } from './dto/mark-notification-status.dto';

type AuthenticatedUser = {
  id: number;
  roles: string[];
};

type NotificationExecutor = PrismaService | Prisma.TransactionClient | PrismaClient;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async enqueue(
    executor: NotificationExecutor,
    input: {
      userId: number;
      storeId?: number | null;
      orderId?: number | null;
      paymentId?: number | null;
      supportTicketId?: number | null;
      topic: string;
      title: string;
      body: string;
      payload?: Record<string, unknown> | null;
      channel?: NotificationChannel;
      dedupeKey?: string | null;
    },
  ) {
    return executor.notification.upsert({
      where: {
        dedupeKey: input.dedupeKey ?? undefined,
      },
      update: {
        userId: input.userId,
        storeId: input.storeId ?? null,
        orderId: input.orderId ?? null,
        paymentId: input.paymentId ?? null,
        supportTicketId: input.supportTicketId ?? null,
        topic: input.topic,
        title: input.title,
        body: input.body,
        payload: this.toInputJson(input.payload),
        channel: input.channel ?? NotificationChannel.IN_APP,
        status: NotificationStatus.PENDING,
        sentAt: null,
        failedAt: null,
        cancelledAt: null,
        failureReason: null,
      },
      create: {
        userId: input.userId,
        storeId: input.storeId ?? null,
        orderId: input.orderId ?? null,
        paymentId: input.paymentId ?? null,
        supportTicketId: input.supportTicketId ?? null,
        topic: input.topic,
        title: input.title,
        body: input.body,
        payload: this.toInputJson(input.payload),
        channel: input.channel ?? NotificationChannel.IN_APP,
        status: NotificationStatus.PENDING,
        dedupeKey: input.dedupeKey ?? null,
      },
    });
  }

  async adminList(user: AuthenticatedUser, query: AdminListNotificationsQueryDto) {
    this.assertAdmin(user);
    const { page = 1, limit = 20, status, channel } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      ...(status ? { status } : {}),
      ...(channel ? { channel } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, phoneNumber: true, fullName: true } },
          store: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: items,
      meta: { total, page, lastPage: Math.ceil(total / limit) },
    };
  }

  async adminMarkStatus(user: AuthenticatedUser, id: number, dto: MarkNotificationStatusDto) {
    this.assertAdmin(user);
    await this.getOrThrow(id);

    return this.prisma.notification.update({
      where: { id },
      data: {
        status: dto.status,
        sentAt: dto.status === NotificationStatus.SENT ? new Date() : null,
        failedAt: dto.status === NotificationStatus.FAILED ? new Date() : null,
        cancelledAt: dto.status === NotificationStatus.CANCELLED ? new Date() : null,
        failureReason: dto.status === NotificationStatus.FAILED ? dto.note ?? 'delivery failed' : null,
      },
    });
  }

  async myNotifications(user: AuthenticatedUser) {
    return this.prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async vendorNotifications(user: AuthenticatedUser) {
    this.assertVendor(user);
    const store = await this.prisma.store.findFirst({
      where: { ownerId: user.id },
      select: { id: true },
    });

    if (!store) {
      throw new NotFoundException('فروشگاهی برای این فروشنده یافت نشد');
    }

    return this.prisma.notification.findMany({
      where: {
        OR: [
          { userId: user.id },
          { storeId: store.id },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  private async getOrThrow(id: number) {
    const item = await this.prisma.notification.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('notification مورد نظر یافت نشد');
    }
    return item;
  }

  private toInputJson(value?: Record<string, unknown> | null) {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return Prisma.JsonNull;
    }

    return value as Prisma.InputJsonValue;
  }

  private assertAdmin(user: AuthenticatedUser) {
    if (!user.roles.includes('ADMIN')) {
      throw new ForbiddenException('این endpoint فقط برای ادمین مجاز است');
    }
  }

  private assertVendor(user: AuthenticatedUser) {
    if (!user.roles.includes('VENDOR')) {
      throw new ForbiddenException('این endpoint فقط برای فروشنده مجاز است');
    }
  }
}
