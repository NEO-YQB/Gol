import { Injectable } from '@nestjs/common';
import { Notification, NotificationChannel, NotificationStatus, Prisma } from '@prisma/client';
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
  title: string;
  body: string;
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
      providerMessageId: `in-app:${context.notification.id}`,
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
      providerMessageId: `${this.channel.toLowerCase()}:${context.notification.id}`,
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
      forceRetry?: boolean;
    },
  ) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return null;
    }

    if (
      !options?.forceRetry &&
      (notification.status === NotificationStatus.SENT ||
        notification.status === NotificationStatus.CANCELLED)
    ) {
      return this.buildResult(notification, false, 'notification در وضعیت قابل dispatch نیست');
    }

    const channel = options?.overrideChannel ?? notification.channel;
    const adapter = this.adapters.find((item) => item.supports(channel));

    if (!adapter) {
      return this.failNotification(notification, channel, 'adapter مناسب برای این channel یافت نشد');
    }

    const rendered = this.resolveContent(notification);
    const attemptTime = new Date();

    try {
      const result = await adapter.dispatch({
        notification,
        title: rendered.title,
        body: rendered.body,
      });

      if (!result.ok) {
        return this.failNotification(
          notification,
          channel,
          result.failureReason ?? 'dispatch ناموفق بود',
          result.providerResponse ?? null,
          attemptTime,
        );
      }

      const updated = await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          channel,
          title: rendered.title,
          body: rendered.body,
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

      return this.buildResult(updated, true);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'dispatch با خطا مواجه شد';
      return this.failNotification(notification, channel, reason, null, attemptTime);
    }
  }

  private async failNotification(
    notification: Notification,
    channel: NotificationChannel,
    reason: string,
    providerResponse?: Record<string, unknown> | null,
    attemptTime = new Date(),
  ) {
    const updated = await this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        channel,
        status: NotificationStatus.FAILED,
        attempts: { increment: 1 },
        lastAttemptAt: attemptTime,
        failedAt: attemptTime,
        failureReason: reason,
        providerResponse: this.toJson(providerResponse ?? null),
      },
    });

    return this.buildResult(updated, false, reason);
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

  private buildResult(notification: Notification, ok: boolean, reason?: string) {
    return {
      ok,
      reason: reason ?? null,
      notification,
    };
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
