import { Injectable, Logger } from '@nestjs/common';
import { Notification, NotificationChannel, NotificationDelivery, NotificationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FirebaseAdminService } from './firebase-admin.service';
import { NotificationTemplatesService } from './notification-templates.service';

type AdapterDispatchResult = {
  ok: boolean;
  providerMessageId?: string | null;
  providerResponse?: Record<string, unknown> | null;
  failureReason?: string | null;
};

type DispatchContext = {
  notification: Notification;
  delivery: NotificationDelivery;
  title: string;
  body: string;
};

type DispatchResult = {
  ok: boolean;
  reason: string | null;
  notification: Notification & { deliveries?: NotificationDelivery[] };
  delivery: NotificationDelivery;
};

interface NotificationAdapter {
  supports(channel: NotificationChannel): boolean;
  dispatch(context: DispatchContext): Promise<AdapterDispatchResult>;
}

class InAppNotificationAdapter implements NotificationAdapter {
  supports(channel: NotificationChannel) {
    return channel === NotificationChannel.IN_APP;
  }

  async dispatch(context: DispatchContext): Promise<AdapterDispatchResult> {
    return {
      ok: true,
      providerMessageId: `in-app:${context.notification.id}:${context.delivery.id}`,
      providerResponse: {
        adapter: 'in-app',
        simulated: true,
      },
    };
  }
}

class MockExternalNotificationAdapter implements NotificationAdapter {
  constructor(private readonly channel: NotificationChannel) {}

  supports(channel: NotificationChannel) {
    return this.channel === channel;
  }

  async dispatch(context: DispatchContext): Promise<AdapterDispatchResult> {
    return {
      ok: true,
      providerMessageId: `${this.channel.toLowerCase()}:${context.notification.id}:${context.delivery.id}`,
      providerResponse: {
        adapter: `mock-${this.channel.toLowerCase()}`,
        simulated: true,
        preview: {
          title: context.title,
          body: context.body,
        },
      },
    };
  }
}

class PushNotificationAdapter implements NotificationAdapter {
  private readonly logger = new Logger(PushNotificationAdapter.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly firebaseAdminService: FirebaseAdminService,
  ) {}

  supports(channel: NotificationChannel) {
    return channel === NotificationChannel.PUSH;
  }

  async dispatch(context: DispatchContext): Promise<AdapterDispatchResult> {
    if (!this.firebaseAdminService.isConfigured()) {
      return {
        ok: false,
        failureReason: 'تنظیمات Firebase Admin برای PUSH کامل نشده است',
      };
    }

    const recipientUserIds = await this.resolveRecipientUserIds(context.notification);

    this.logger.log(
      `Preparing PUSH dispatch for notification=${context.notification.id} topic=${context.notification.topic} recipients=${recipientUserIds.join(',') || 'none'} storeId=${context.notification.storeId ?? 'null'}`,
    );

    const devices = await this.prisma.pushDevice.findMany({
      where: {
        userId: {
          in: recipientUserIds,
        },
        isActive: true,
      },
      select: {
        id: true,
        userId: true,
        token: true,
      },
      take: 20,
    });

    if (devices.length === 0) {
      this.logger.warn(
        `No active PUSH devices found for notification=${context.notification.id} recipients=${recipientUserIds.join(',') || 'none'}`,
      );
      return {
        ok: false,
        failureReason: 'هیچ device token فعالی برای این کاربر ثبت نشده است',
      };
    }

    const messaging = this.firebaseAdminService.messaging;
    if (!messaging) {
      return {
        ok: false,
        failureReason: 'Firebase Messaging در backend در دسترس نیست',
      };
    }

    const data: Record<string, string> = {
      topic: context.notification.topic,
      title: context.title,
      body: context.body,
    };

    if (context.notification.orderId != null) {
      data.orderId = String(context.notification.orderId);
    }
    if (context.notification.supportTicketId != null) {
      data.supportTicketId = String(context.notification.supportTicketId);
    }

    const response = await messaging.sendEachForMulticast({
      tokens: devices.map((item) => item.token),
      notification: {
        title: context.title,
        body: context.body,
      },
      data,
      android: {
        priority: 'high',
        notification: {
          channelId: 'vendor_push_channel',
          sound: 'default',
        },
      },
    });

    this.logger.log(
      `PUSH dispatch result notification=${context.notification.id} success=${response.successCount} failure=${response.failureCount} devices=${devices.length}`,
    );

    const invalidTokens = response.responses
      .map((item, index) => ({
        item,
        token: devices[index]?.token,
      }))
      .filter(
        ({ item, token }) =>
          Boolean(token) &&
          !item.success &&
          typeof item.error?.code === 'string' &&
          (item.error.code.includes('registration-token-not-registered') ||
            item.error.code.includes('invalid-registration-token')),
      )
      .map(({ token }) => token!)
      .filter(Boolean);

    if (invalidTokens.length > 0) {
      this.logger.warn(
        `Deactivating invalid PUSH tokens for notification=${context.notification.id} count=${invalidTokens.length}`,
      );
      await this.prisma.pushDevice.updateMany({
        where: {
          token: { in: invalidTokens },
        },
        data: {
          isActive: false,
        },
      });
    }

    if (response.successCount === 0) {
      const firstError = response.responses.find((item) => !item.success)?.error;
      this.logger.error(
        `PUSH dispatch failed notification=${context.notification.id} error=${firstError?.code ?? 'unknown'} ${firstError?.message ?? ''}`,
      );
      return {
        ok: false,
        failureReason: firstError?.message ?? 'ارسال PUSH ناموفق بود',
        providerResponse: {
          successCount: response.successCount,
          failureCount: response.failureCount,
          recipientUserIds,
          deviceUserIds: devices.map((item) => item.userId),
          firstErrorCode: firstError?.code ?? null,
          firstErrorMessage: firstError?.message ?? null,
        },
      };
    }

    return {
      ok: true,
      providerMessageId: `push:${context.notification.id}:${context.delivery.id}`,
      providerResponse: {
        successCount: response.successCount,
        failureCount: response.failureCount,
        recipientUserIds,
        deviceUserIds: devices.map((item) => item.userId),
      },
    };
  }

  private async resolveRecipientUserIds(notification: Notification) {
    const recipientIds = new Set<number>();

    if (notification.userId != null) {
      recipientIds.add(notification.userId);
    }

    if (notification.storeId != null) {
      const store = await this.prisma.store.findUnique({
        where: { id: notification.storeId },
        select: { ownerId: true },
      });

      if (store?.ownerId != null) {
        recipientIds.add(store.ownerId);
      }
    }

    return [...recipientIds];
  }
}

@Injectable()
export class NotificationDispatchService {
  private readonly adapters: NotificationAdapter[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly templatesService: NotificationTemplatesService,
    private readonly firebaseAdminService: FirebaseAdminService,
  ) {
    this.adapters = [
      new InAppNotificationAdapter(),
      new MockExternalNotificationAdapter(NotificationChannel.SMS),
      new MockExternalNotificationAdapter(NotificationChannel.EMAIL),
      new PushNotificationAdapter(this.prisma, this.firebaseAdminService),
    ];
  }

  async simulateDispatch(
    notificationId: number,
    options?: {
      overrideChannel?: NotificationChannel;
      overrideChannels?: NotificationChannel[];
      forceRetry?: boolean;
    },
  ) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      include: {
        deliveries: {
          orderBy: [{ createdAt: 'asc' }],
        },
      },
    });

    if (!notification) {
      return null;
    }

    const channels = Array.from(
      new Set(
        options?.overrideChannels?.length
          ? options.overrideChannels
          : [options?.overrideChannel ?? notification.channel],
      ),
    );
    const results: DispatchResult[] = [];

    for (const channel of channels) {
      const delivery = await this.findOrCreateDelivery(notification, channel);

      if (
        !options?.forceRetry &&
        (delivery.status === NotificationStatus.SENT ||
          delivery.status === NotificationStatus.CANCELLED)
      ) {
        results.push(this.buildResult(notification, delivery, false, 'delivery در وضعیت قابل dispatch نیست'));
        continue;
      }

      const adapter = this.adapters.find((item) => item.supports(channel));

      if (!adapter) {
        results.push(
          await this.failDelivery(notification, delivery, channel, 'adapter مناسب برای این channel یافت نشد'),
        );
        continue;
      }

      const rendered = this.resolveContent(notification);
      const attemptTime = new Date();

      try {
        const result = await adapter.dispatch({
          notification,
          delivery,
          title: rendered.title,
          body: rendered.body,
        });

        if (!result.ok) {
          results.push(
            await this.failDelivery(
              notification,
              delivery,
              channel,
              result.failureReason ?? 'dispatch ناموفق بود',
              result.providerResponse ?? null,
              attemptTime,
            ),
          );
          continue;
        }

        const updated = await this.prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: NotificationStatus.SENT,
            attempts: { increment: 1 },
            lastAttemptAt: attemptTime,
            sentAt: attemptTime,
            failedAt: null,
            cancelledAt: null,
            failureReason: null,
            providerMessageId: result.providerMessageId ?? null,
            providerResponse: this.toJson(result.providerResponse ?? null),
          },
        });

        await this.syncNotificationSnapshot(notification.id);
        const refreshed = await this.getNotificationWithDeliveries(notification.id);
        results.push(this.buildResult(refreshed, updated, true));
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'dispatch با خطا مواجه شد';
        results.push(await this.failDelivery(notification, delivery, channel, reason, null, attemptTime));
      }
    }

    return results;
  }

  private async failDelivery(
    notification: Notification,
    delivery: NotificationDelivery,
    _channel: NotificationChannel,
    reason: string,
    providerResponse?: Record<string, unknown> | null,
    attemptTime = new Date(),
  ) {
    const updated = await this.prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: {
        status: NotificationStatus.FAILED,
        attempts: { increment: 1 },
        lastAttemptAt: attemptTime,
        failedAt: attemptTime,
        failureReason: reason,
        providerResponse: this.toJson(providerResponse ?? null),
      },
    });

    await this.syncNotificationSnapshot(notification.id);
    const refreshed = await this.getNotificationWithDeliveries(notification.id);

    return this.buildResult(refreshed, updated, false, reason);
  }

  private resolveContent(notification: Notification) {
    const templateKey = notification.templateKey ?? notification.topic;
    const templateData = this.toRecord(notification.templateData) ?? this.toRecord(notification.payload) ?? {};
    const rendered = templateKey ? this.templatesService.render(templateKey, templateData) : null;

    return {
      title: rendered?.title ?? notification.title,
      body: rendered?.body ?? notification.body,
    };
  }

  private buildResult(
    notification: Notification & { deliveries?: NotificationDelivery[] },
    delivery: NotificationDelivery,
    ok: boolean,
    reason?: string,
  ) {
    return {
      ok,
      reason: reason ?? null,
      notification,
      delivery,
    };
  }

  private async findOrCreateDelivery(
    notification: Notification & { deliveries?: NotificationDelivery[] },
    channel: NotificationChannel,
  ) {
    const existing = notification.deliveries?.find((item) => item.channel === channel);
    if (existing) {
      return existing;
    }

    return this.prisma.notificationDelivery.create({
      data: {
        notificationId: notification.id,
        userId: notification.userId,
        storeId: notification.storeId,
        channel,
        title: notification.title,
        body: notification.body,
        dedupeKey: notification.dedupeKey ? `${notification.dedupeKey}:${channel}` : `${notification.id}:${channel}`,
      },
    });
  }

  private async syncNotificationSnapshot(notificationId: number) {
    const deliveries = await this.prisma.notificationDelivery.findMany({
      where: { notificationId },
      orderBy: [{ lastAttemptAt: 'desc' }, { createdAt: 'desc' }],
    });

    const latest = deliveries[0];
    const sent = deliveries.some((item) => item.status === NotificationStatus.SENT);
    const pending = deliveries.some((item) => item.status === NotificationStatus.PENDING);
    const failed = deliveries.some((item) => item.status === NotificationStatus.FAILED);
    const cancelled = deliveries.every((item) => item.status === NotificationStatus.CANCELLED);

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        channel: latest?.channel ?? NotificationChannel.IN_APP,
        title: latest?.title,
        body: latest?.body,
        status: sent
          ? NotificationStatus.SENT
          : pending
            ? NotificationStatus.PENDING
            : failed
              ? NotificationStatus.FAILED
              : cancelled
                ? NotificationStatus.CANCELLED
                : NotificationStatus.PENDING,
        attempts: deliveries.reduce((sum, item) => sum + item.attempts, 0),
        lastAttemptAt: latest?.lastAttemptAt ?? null,
        sentAt: latest?.sentAt ?? null,
        failedAt: latest?.failedAt ?? null,
        cancelledAt: latest?.cancelledAt ?? null,
        failureReason: latest?.failureReason ?? null,
        providerMessageId: latest?.providerMessageId ?? null,
        providerResponse: this.toJson(this.toRecord(latest?.providerResponse ?? null)),
      },
    });
  }

  private getNotificationWithDeliveries(id: number) {
    return this.prisma.notification.findUniqueOrThrow({
      where: { id },
      include: {
        deliveries: {
          orderBy: [{ createdAt: 'asc' }],
        },
      },
    });
  }

  private toRecord(value: Prisma.JsonValue | null): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }

  private toJson(value: Record<string, unknown> | null) {
    if (value === null) {
      return Prisma.JsonNull;
    }

    return value as Prisma.InputJsonValue;
  }
}
