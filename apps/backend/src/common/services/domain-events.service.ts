import { Injectable } from '@nestjs/common';
import {
  DomainEventStatus,
  DomainEventType,
  Prisma,
  PrismaClient,
} from '@prisma/client';

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

type RecordDomainEventInput = {
  eventType: DomainEventType;
  aggregateType: string;
  aggregateId: number;
  actorUserId?: number | null;
  storeId?: number | null;
  orderId?: number | null;
  paymentId?: number | null;
  supportTicketId?: number | null;
  walletId?: number | null;
  summary?: string | null;
  payload?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  status?: DomainEventStatus;
  processedAt?: Date | null;
  failureReason?: string | null;
};

@Injectable()
export class DomainEventsService {
  async record(
    executor: PrismaExecutor,
    input: RecordDomainEventInput,
  ) {
    return executor.domainEvent.create({
      data: {
        eventType: input.eventType,
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        actorUserId: input.actorUserId ?? null,
        storeId: input.storeId ?? null,
        orderId: input.orderId ?? null,
        paymentId: input.paymentId ?? null,
        supportTicketId: input.supportTicketId ?? null,
        walletId: input.walletId ?? null,
        summary: input.summary ?? null,
        payload: this.toJson(input.payload),
        metadata: this.toJson(input.metadata),
        status: input.status ?? DomainEventStatus.PENDING,
        processedAt: input.processedAt ?? null,
        failureReason: input.failureReason ?? null,
      },
    });
  }

  private toJson(value?: Record<string, unknown> | null) {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return Prisma.JsonNull;
    }

    return value as Prisma.InputJsonValue;
  }
}
