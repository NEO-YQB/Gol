import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationStatus,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationDispatchService } from './notification-dispatch.service';
import { NotificationTemplatesService } from './notification-templates.service';
import { AdminCreatePushNotificationDto } from './dto/admin-create-push-notification.dto';
import { AdminDispatchNotificationDto } from './dto/admin-dispatch-notification.dto';
import { AdminListNotificationsQueryDto } from './dto/admin-list-notifications-query.dto';
import { MarkNotificationStatusDto } from './dto/mark-notification-status.dto';
import { RegisterPushDeviceDto } from './dto/register-push-device.dto';

type AuthenticatedUser = {
  id: number;
  roles: string[];
};

type NotificationExecutor = PrismaService | Prisma.TransactionClient | PrismaClient;

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly templatesService: NotificationTemplatesService,
    private readonly dispatchService: NotificationDispatchService,
  ) {}

  async enqueue(
    executor: NotificationExecutor,
    input: {
      userId: number;
      storeId?: number | null;
      orderId?: number | null;
      paymentId?: number | null;
      supportTicketId?: number | null;
      topic: string;
      title?: string;
      body?: string;
      payload?: Record<string, unknown> | null;
      templateKey?: string | null;
      templateData?: Record<string, unknown> | null;
      channel?: NotificationChannel;
      channels?: NotificationChannel[];
      dedupeKey?: string | null;
    },
  ) {
    const templateKey = input.templateKey ?? input.topic;
    const templateData = input.templateData ?? input.payload ?? null;
    const rendered = templateKey
      ? this.templatesService.render(templateKey, templateData ?? undefined)
      : null;
    const title = input.title ?? rendered?.title ?? input.topic;
    const body = input.body ?? rendered?.body ?? input.topic;

    const notification = input.dedupeKey
      ? await executor.notification.upsert({
          where: {
            dedupeKey: input.dedupeKey,
          },
          update: {
            userId: input.userId,
            storeId: input.storeId ?? null,
            orderId: input.orderId ?? null,
            paymentId: input.paymentId ?? null,
            supportTicketId: input.supportTicketId ?? null,
            topic: input.topic,
            templateKey,
            title,
            body,
            payload: this.toInputJson(input.payload),
            templateData: this.toInputJson(templateData),
            channel: input.channel ?? NotificationChannel.IN_APP,
            status: NotificationStatus.PENDING,
            attempts: 0,
            lastAttemptAt: null,
            sentAt: null,
            failedAt: null,
            cancelledAt: null,
            failureReason: null,
            providerResponse: Prisma.JsonNull,
            providerMessageId: null,
          },
          create: {
            userId: input.userId,
            storeId: input.storeId ?? null,
            orderId: input.orderId ?? null,
            paymentId: input.paymentId ?? null,
            supportTicketId: input.supportTicketId ?? null,
            topic: input.topic,
            templateKey,
            title,
            body,
            payload: this.toInputJson(input.payload),
            templateData: this.toInputJson(templateData),
            channel: input.channel ?? NotificationChannel.IN_APP,
            status: NotificationStatus.PENDING,
            dedupeKey: input.dedupeKey,
          },
        })
      : await executor.notification.create({
          data: {
            userId: input.userId,
            storeId: input.storeId ?? null,
            orderId: input.orderId ?? null,
            paymentId: input.paymentId ?? null,
            supportTicketId: input.supportTicketId ?? null,
            topic: input.topic,
            templateKey,
            title,
            body,
            payload: this.toInputJson(input.payload),
            templateData: this.toInputJson(templateData),
            channel: input.channel ?? NotificationChannel.IN_APP,
            status: NotificationStatus.PENDING,
            dedupeKey: null,
          },
        });

    const channels = Array.from(
      new Set(input.channels?.length ? input.channels : [input.channel ?? NotificationChannel.IN_APP]),
    );

    await Promise.all(
      channels.map((channel) =>
        executor.notificationDelivery.upsert({
          where: {
            dedupeKey: input.dedupeKey ? `${input.dedupeKey}:${channel}` : `${notification.id}:${channel}`,
          },
          update: {
            userId: input.userId,
            storeId: input.storeId ?? null,
            channel,
            title,
            body,
            status: NotificationStatus.PENDING,
            attempts: 0,
            lastAttemptAt: null,
            sentAt: null,
            failedAt: null,
            cancelledAt: null,
            failureReason: null,
            providerResponse: Prisma.JsonNull,
            providerMessageId: null,
          },
          create: {
            notificationId: notification.id,
            userId: input.userId,
            storeId: input.storeId ?? null,
            channel,
            title,
            body,
            status: NotificationStatus.PENDING,
            dedupeKey: input.dedupeKey ? `${input.dedupeKey}:${channel}` : `${notification.id}:${channel}`,
          },
        }),
      ),
    );

    const item = await executor.notification.findUnique({
      where: { id: notification.id },
      include: {
        deliveries: {
          orderBy: [{ createdAt: 'asc' }],
        },
      },
    });

    if (!item) {
      throw new NotFoundException('notification مورد نظر یافت نشد');
    }

    return item;
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
          deliveries: {
            orderBy: [{ createdAt: 'asc' }],
          },
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

  async adminDispatch(user: AuthenticatedUser, id: number, dto: AdminDispatchNotificationDto) {
    this.assertAdmin(user);
    if (dto.title?.trim() || dto.body?.trim() || dto.data) {
      await this.prisma.notification.update({
        where: { id },
        data: {
          ...(dto.title?.trim() ? { title: dto.title.trim() } : {}),
          ...(dto.body?.trim() ? { body: dto.body.trim() } : {}),
          ...(dto.data ? { payload: dto.data as Prisma.InputJsonValue } : {}),
        },
      });
    }

    const items = await this.dispatchService.simulateDispatch(id, {
      overrideChannel: dto.channel,
      overrideChannels: dto.channels,
      forceRetry: dto.forceRetry,
    });

    if (!items || items.length === 0) {
      throw new NotFoundException('notification مورد نظر یافت نشد');
    }

    return dto.channels?.length ? { results: items } : items[0];
  }

  async adminCreatePush(user: AuthenticatedUser, dto: AdminCreatePushNotificationDto) {
    this.assertAdmin(user);

    const notification = await this.enqueue(this.prisma, {
      userId: dto.userId,
      storeId: dto.storeId ?? null,
      orderId: dto.orderId ?? null,
      supportTicketId: dto.supportTicketId ?? null,
      topic: dto.topic.trim(),
      title: dto.title.trim(),
      body: dto.body.trim(),
      payload: dto.payload ?? null,
      channel: NotificationChannel.PUSH,
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
      dedupeKey: null,
    });

    const result = await this.dispatchService.simulateDispatch(notification.id, {
      overrideChannels: [NotificationChannel.PUSH],
      forceRetry: true,
    });

    const pushResult = result?.find((item) => item.delivery.channel === NotificationChannel.PUSH) ?? null;

    if (!pushResult) {
      throw new BadRequestException('نتیجه dispatch پوش از backend دریافت نشد');
    }

    if (!pushResult.ok) {
      const providerResponse =
        pushResult.delivery.providerResponse && typeof pushResult.delivery.providerResponse === 'object'
          ? pushResult.delivery.providerResponse
          : null;

      throw new BadRequestException({
        message: pushResult.reason ?? 'ارسال PUSH ناموفق بود',
        deliveryId: pushResult.delivery.id,
        notificationId: notification.id,
        providerResponse,
      });
    }

    return {
      notification,
      dispatch: pushResult,
    };
  }

  async myNotifications(user: AuthenticatedUser) {
    return this.prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        deliveries: {
          orderBy: [{ createdAt: 'asc' }],
        },
      },
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
      include: {
        deliveries: {
          orderBy: [{ createdAt: 'asc' }],
        },
      },
    });
  }

  async registerPushDevice(
    user: AuthenticatedUser,
    dto: RegisterPushDeviceDto,
  ) {
    const token = dto.token.trim();
    if (!token) {
      throw new NotFoundException('توکن دستگاه معتبر نیست');
    }

    await this.prisma.pushDevice.updateMany({
      where: {
        token,
        userId: { not: user.id },
      },
      data: {
        isActive: false,
      },
    });

    return this.prisma.pushDevice.upsert({
      where: { token },
      update: {
        userId: user.id,
        platform: dto.platform,
        deviceLabel: dto.deviceLabel?.trim() || null,
        appVersion: dto.appVersion?.trim() || null,
        isActive: true,
        lastSeenAt: new Date(),
      },
      create: {
        userId: user.id,
        token,
        platform: dto.platform,
        deviceLabel: dto.deviceLabel?.trim() || null,
        appVersion: dto.appVersion?.trim() || null,
        isActive: true,
      },
      select: {
        id: true,
        token: true,
        platform: true,
        isActive: true,
        lastSeenAt: true,
      },
    });
  }

  private async getOrThrow(id: number) {
    const item = await this.prisma.notification.findUnique({
      where: { id },
      include: {
        deliveries: {
          orderBy: [{ createdAt: 'asc' }],
        },
      },
    });
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
