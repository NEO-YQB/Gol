import { Injectable } from '@nestjs/common';
import { Notification, NotificationChannel, NotificationDelivery, NotificationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
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

@Injectable()
export class NotificationDispatchService {
  private readonly adapters: NotificationAdapter[] = [
    new InAppNotificationAdapter(),
    new MockExternalNotificationAdapter(NotificationChannel.SMS),
    new MockExternalNotificationAdapter(NotificationChannel.EMAIL),
    new MockExternalNotificationAdapter(NotificationChannel.PUSH),
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly templatesService: NotificationTemplatesService,
  ) {}

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
