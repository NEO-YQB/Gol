import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { DomainEventType, OrderActorType, OrderStatus, PaymentMethod, PaymentReviewStatus, PaymentStatus, Prisma } from '@prisma/client';
import { subject } from '@casl/ability';
import { DomainEventsService } from '../../common/services/domain-events.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AbilityFactory } from '../auth/ability.factory';
import { AdminManualRefundDto } from './dto/admin-manual-refund.dto';
import { AdminListPaymentsQueryDto } from './dto/admin-list-payments-query.dto';
import { AdminUpdatePaymentReviewDto } from './dto/admin-update-payment-review.dto';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { MockVerifyPaymentDto } from './dto/mock-verify-payment.dto';
import { PaymentGatewayRegistryService } from './payment-gateway-registry.service';
import { PaymentGatewayService } from './payment-gateway.service';

type AuthenticatedUser = {
  id: number;
  roles: string[];
};

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventsService,
    private readonly abilityFactory: AbilityFactory,
    private readonly paymentGatewayService: PaymentGatewayService,
    private readonly paymentGatewayRegistry: PaymentGatewayRegistryService,
  ) {}

  async initiate(user: AuthenticatedUser, dto: InitiatePaymentDto) {
    const order = await this.getOrderForPayment(dto.orderId);
    await this.assertCanAccessOrderPayment(user, order);

    if (order.paymentMethod !== PaymentMethod.ONLINE) {
      throw new BadRequestException('برای سفارش های COD نیازی به initiation پرداخت وجود ندارد');
    }

    if (this.isTerminalOrderStatus(order.status)) {
      throw new BadRequestException('برای سفارش نهایی شده امکان شروع پرداخت وجود ندارد');
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('این سفارش قبلا با موفقیت پرداخت شده است');
    }

    if (order.payment) {
      await this.expirePaymentIfNeeded(order.payment.id);
    }

    const refreshedOrder = await this.getOrderForPayment(dto.orderId);

    if (refreshedOrder.paymentStatus === PaymentStatus.EXPIRED) {
      throw new BadRequestException(
        'مهلت پرداخت این سفارش به پایان رسیده و برای ادامه باید سفارش جدید بسازید',
      );
    }

    if (
      refreshedOrder.payment &&
      refreshedOrder.payment.status === PaymentStatus.PENDING &&
      !this.isExpired(refreshedOrder.payment.expiresAt)
    ) {
      throw new BadRequestException(
        `یک payment فعال برای این سفارش وجود دارد و تا ${refreshedOrder.payment.expiresAt?.toISOString()} معتبر است`,
      );
    }

    const gatewayConfig = await this.paymentGatewayService.resolveGatewaySelection({
      gatewayConfigId: dto.gatewayConfigId,
      gatewayKey: dto.gatewayKey,
    });
    const adapter = this.paymentGatewayRegistry.getAdapter(gatewayConfig.driver);
    const amount = Number(refreshedOrder.totalAmount);
    const nextAttemptCount = (refreshedOrder.payment?.attemptCount ?? 0) + 1;
    const maxRetryAttempts = this.readPositiveIntConfig(
      gatewayConfig.technicalConfig,
      'maxRetryAttempts',
      3,
    );

    if (nextAttemptCount > maxRetryAttempts) {
      throw new BadRequestException(
        `تعداد تلاش های پرداخت از حد مجاز بیشتر شده است. حداکثر ${maxRetryAttempts} تلاش مجاز است`,
      );
    }

    const gatewayResult = await adapter.initiate({
      amount,
      orderId: refreshedOrder.id,
      callbackUrl: gatewayConfig.callbackUrl,
      returnUrl: gatewayConfig.returnUrl,
      config: gatewayConfig,
    });

    const initiatedAt = new Date();
    const expiresAt = new Date(
      initiatedAt.getTime() +
        this.readPositiveIntConfig(gatewayConfig.technicalConfig, 'paymentWindowMinutes', 15) *
          60 *
          1000,
    );
    const payment = await this.prisma.payment.upsert({
      where: { orderId: refreshedOrder.id },
      update: {
        gatewayConfigId: gatewayConfig.id,
        gateway: gatewayConfig.driver,
        gatewayKey: gatewayConfig.key,
        authority: gatewayResult.authority,
        status: PaymentStatus.PENDING,
        refId: null,
        failureReason: null,
        paymentUrl: gatewayResult.paymentUrl,
        initiatedAt,
        expiresAt,
        verifiedAt: null,
        attemptCount: nextAttemptCount,
        amount: new Prisma.Decimal(amount),
        gatewaySnapshot: this.toInputJson(this.buildGatewaySnapshot(gatewayConfig)),
        rawInitiateData: this.toInputJson({
          orderId: refreshedOrder.id,
          userId: user.id,
          amount,
          attemptCount: nextAttemptCount,
          maxRetryAttempts,
          driver: gatewayConfig.driver,
          gatewayKey: gatewayConfig.key,
          callbackUrl: gatewayConfig.callbackUrl,
          returnUrl: gatewayConfig.returnUrl,
          adapterResponse: gatewayResult.rawData ?? null,
        }),
      },
      create: {
        orderId: refreshedOrder.id,
        userId: refreshedOrder.userId,
        gatewayConfigId: gatewayConfig.id,
        gateway: gatewayConfig.driver,
        gatewayKey: gatewayConfig.key,
        authority: gatewayResult.authority,
        status: PaymentStatus.PENDING,
        paymentUrl: gatewayResult.paymentUrl,
        initiatedAt,
        expiresAt,
        attemptCount: nextAttemptCount,
        amount: new Prisma.Decimal(amount),
        gatewaySnapshot: this.toInputJson(this.buildGatewaySnapshot(gatewayConfig)),
        rawInitiateData: this.toInputJson({
          orderId: refreshedOrder.id,
          userId: user.id,
          amount,
          attemptCount: nextAttemptCount,
          maxRetryAttempts,
          driver: gatewayConfig.driver,
          gatewayKey: gatewayConfig.key,
          callbackUrl: gatewayConfig.callbackUrl,
          returnUrl: gatewayConfig.returnUrl,
          adapterResponse: gatewayResult.rawData ?? null,
        }),
      },
      include: this.getPaymentInclude(),
    });

    await this.domainEvents.record(this.prisma, {
      eventType: DomainEventType.PAYMENT_INITIATED,
      aggregateType: 'payment',
      aggregateId: payment.id,
      actorUserId: user.id,
      storeId: refreshedOrder.storeId,
      orderId: refreshedOrder.id,
      paymentId: payment.id,
      summary: `پرداخت برای سفارش #${refreshedOrder.id} شروع شد`,
      payload: {
        gatewayKey: gatewayConfig.key,
        attemptCount: nextAttemptCount,
        expiresAt: expiresAt.toISOString(),
      },
    });

    if (refreshedOrder.paymentStatus !== PaymentStatus.PENDING) {
      await this.prisma.order.update({
        where: { id: refreshedOrder.id },
        data: { paymentStatus: PaymentStatus.PENDING },
      });
    }

    return {
      message: 'payment initiation با موفقیت ایجاد شد',
      payment,
      gateway: {
        id: gatewayConfig.id,
        key: gatewayConfig.key,
        displayName: gatewayConfig.displayName,
        driver: gatewayConfig.driver,
        authority: gatewayResult.authority,
        paymentUrl: gatewayResult.paymentUrl,
      },
    };
  }

  async mockVerify(user: AuthenticatedUser, dto: MockVerifyPaymentDto) {
    await this.expirePaymentIfNeeded(dto.paymentId);
    const payment = await this.getPaymentOrThrow(dto.paymentId);
    await this.assertCanAccessPayment(user, payment);

    if (payment.order.paymentMethod !== PaymentMethod.ONLINE) {
      throw new BadRequestException('mock verify فقط برای سفارش آنلاین معتبر است');
    }

    if (payment.order.paymentStatus === PaymentStatus.PAID && dto.success) {
      throw new BadRequestException('این payment قبلا با موفقیت verify شده است');
    }

    if (payment.status === PaymentStatus.EXPIRED || payment.order.paymentStatus === PaymentStatus.EXPIRED) {
      throw new BadRequestException('مهلت این payment به پایان رسیده و دیگر قابل verify نیست');
    }

    const gatewayConfig = payment.gatewayConfig;
    if (!gatewayConfig) {
      throw new BadRequestException('برای این payment gateway config معتبر پیدا نشد');
    }

    const adapter = this.paymentGatewayRegistry.getAdapter(payment.gateway);
    const verificationResult = await adapter.verify({
      payment,
      refId: dto.refId,
      success: dto.success,
      failureReason: dto.failureReason,
    });

    const nextOrderPaymentStatus = verificationResult.success
      ? PaymentStatus.PAID
      : PaymentStatus.FAILED;
    const nextOrderStatus = verificationResult.success
      ? payment.order.status === OrderStatus.PENDING
        ? OrderStatus.PAID
        : payment.order.status
      : OrderStatus.PENDING;
    const verifiedAt = verificationResult.success ? new Date() : null;
    const rawVerifyData = this.toInputJson({
      actorUserId: user.id,
      driver: gatewayConfig.driver,
      gatewayKey: gatewayConfig.key,
      success: verificationResult.success,
      refId: verificationResult.refId ?? null,
      failureReason: verificationResult.failureReason ?? null,
      verifiedAt: new Date().toISOString(),
      adapterResponse: verificationResult.rawData ?? null,
    });

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: nextOrderPaymentStatus,
          refId: verificationResult.refId ?? null,
          failureReason: verificationResult.failureReason ?? null,
          verifiedAt,
          rawVerifyData,
        },
      }),
      this.prisma.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: nextOrderPaymentStatus,
          status: nextOrderStatus,
        },
      }),
      ...(verificationResult.success && payment.order.status === OrderStatus.PENDING
        ? [
            this.prisma.orderStatusHistory.create({
              data: {
                orderId: payment.orderId,
                fromStatus: payment.order.status,
                toStatus: OrderStatus.PAID,
                actorType: this.isAdmin(user) ? OrderActorType.ADMIN : OrderActorType.CUSTOMER,
                actorUserId: user.id,
                note: `پرداخت آنلاین با gateway ${gatewayConfig.displayName} با موفقیت تایید شد`,
              },
            }),
          ]
        : []),
      this.prisma.domainEvent.create({
        data: {
          eventType: verificationResult.success
            ? DomainEventType.PAYMENT_SUCCEEDED
            : DomainEventType.PAYMENT_FAILED,
          aggregateType: 'payment',
          aggregateId: payment.id,
          actorUserId: user.id,
          storeId: payment.order.storeId,
          orderId: payment.orderId,
          paymentId: payment.id,
          summary: verificationResult.success
            ? `پرداخت سفارش #${payment.orderId} موفق شد`
            : `پرداخت سفارش #${payment.orderId} ناموفق شد`,
          payload: this.toInputJson({
            previousOrderStatus: payment.order.status,
            nextOrderStatus,
            nextPaymentStatus: nextOrderPaymentStatus,
            refId: verificationResult.refId ?? null,
            failureReason: verificationResult.failureReason ?? null,
          }),
        },
      }),
    ]);

    const updatedPayment = await this.getPaymentOrThrow(payment.id);

    return {
      message: verificationResult.success
        ? 'payment با موفقیت verify شد'
        : 'payment به حالت failed رفت',
      payment: updatedPayment,
      orderStatus: nextOrderStatus,
      paymentStatus: nextOrderPaymentStatus,
    };
  }

  async findOne(user: AuthenticatedUser, id: number) {
    await this.expirePaymentIfNeeded(id);
    const payment = await this.getPaymentOrThrow(id);
    await this.assertCanAccessPayment(user, payment);
    return {
      ...payment,
      timeline: payment.order.domainEvents,
      auditTrail: payment.domainEvents,
      latestOperationalFlags: [
        ...(payment.reviewStatus === PaymentReviewStatus.NEEDS_REVIEW ||
        payment.reviewStatus === PaymentReviewStatus.UNDER_REVIEW
          ? ['REVIEW_REQUIRED']
          : []),
        ...(payment.status === PaymentStatus.FAILED ? ['PAYMENT_FAILED'] : []),
      ],
    };
  }

  async adminList(user: AuthenticatedUser, query: AdminListPaymentsQueryDto) {
    this.assertAdmin(user);
    await this.processExpiredPayments();

    return this.prisma.payment.findMany({
      where: {
        status: query.expiredOnly ? PaymentStatus.EXPIRED : query.status,
        reviewStatus: query.reviewStatus,
        gatewayKey: query.gatewayKey,
        userId: query.userId,
        orderId: query.orderId,
      },
      include: this.getPaymentInclude(),
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async processExpiredPayments(user?: AuthenticatedUser) {
    if (user) {
      this.assertAdmin(user);
    }

    const candidates = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.PENDING,
        expiresAt: {
          lte: new Date(),
        },
      },
      select: { id: true },
      orderBy: { expiresAt: 'asc' },
      take: 100,
    });

    let expiredCount = 0;
    for (const candidate of candidates) {
      const changed = await this.expirePaymentIfNeeded(candidate.id);
      if (changed) {
        expiredCount += 1;
      }
    }

    return {
      processedAt: new Date().toISOString(),
      scannedCount: candidates.length,
      expiredCount,
    };
  }

  async adminUpdateReview(
    user: AuthenticatedUser,
    paymentId: number,
    dto: AdminUpdatePaymentReviewDto,
  ) {
    this.assertAdmin(user);
    await this.expirePaymentIfNeeded(paymentId);

    const payment = await this.getPaymentOrThrow(paymentId);

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        reviewStatus: dto.reviewStatus,
        reviewReason: dto.reviewReason ?? payment.reviewReason,
        reviewNote: dto.reviewNote ?? payment.reviewNote,
        reviewedAt: new Date(),
        reviewedByUserId: user.id,
        rawVerifyData: this.toInputJson({
          ...(this.ensureJsonObject(payment.rawVerifyData)),
          adminReview: {
            reviewStatus: dto.reviewStatus,
            reviewReason: dto.reviewReason ?? payment.reviewReason ?? null,
            reviewNote: dto.reviewNote ?? payment.reviewNote ?? null,
            reviewedAt: new Date().toISOString(),
            reviewedByUserId: user.id,
          },
        }),
      },
      include: this.getPaymentInclude(),
    });
  }

  async adminManualRefund(
    user: AuthenticatedUser,
    paymentId: number,
    dto: AdminManualRefundDto,
  ) {
    this.assertAdmin(user);
    await this.expirePaymentIfNeeded(paymentId);

    const payment = await this.getPaymentOrThrow(paymentId);

    if (payment.status !== PaymentStatus.PAID || payment.order.paymentStatus !== PaymentStatus.PAID) {
      throw new BadRequestException('فقط payment پرداخت‌شده قابلیت ثبت refund دستی دارد');
    }

    const refundableOrderStatuses: OrderStatus[] = [
      OrderStatus.REJECTED_BY_VENDOR,
      OrderStatus.CANCELLED,
      OrderStatus.CANCELLED_BY_ADMIN,
      OrderStatus.CANCELLED_BY_CUSTOMER,
    ];

    if (!refundableOrderStatuses.includes(payment.order.status)) {
      throw new BadRequestException(
        'فعلا refund دستی فقط برای سفارش‌های cancel/rejected شده مجاز است',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.REFUNDED,
          reviewStatus: PaymentReviewStatus.RESOLVED,
          reviewReason: dto.reason,
          reviewNote: dto.note ?? payment.reviewNote,
          reviewedAt: new Date(),
          reviewedByUserId: user.id,
          rawVerifyData: this.toInputJson({
            ...(this.ensureJsonObject(payment.rawVerifyData)),
            manualRefund: {
              reason: dto.reason,
              note: dto.note ?? null,
              refundedAt: new Date().toISOString(),
              refundedByUserId: user.id,
            },
          }),
        },
        include: this.getPaymentInclude(),
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: PaymentStatus.REFUNDED,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: payment.orderId,
          fromStatus: payment.order.status,
          toStatus: payment.order.status,
          actorType: OrderActorType.ADMIN,
          actorUserId: user.id,
          reason: dto.reason,
          note: dto.note ?? 'refund دستی برای payment ثبت شد',
        },
      });

      await this.domainEvents.record(tx, {
        eventType: DomainEventType.PAYMENT_REFUNDED,
        aggregateType: 'payment',
        aggregateId: paymentId,
        actorUserId: user.id,
        storeId: payment.order.storeId,
        orderId: payment.orderId,
        paymentId: payment.id,
        summary: `refund دستی برای payment #${payment.id} ثبت شد`,
        payload: {
          reason: dto.reason,
          note: dto.note ?? null,
          refundedAmount: Number(payment.amount),
        },
      });

      return {
        message: 'refund دستی با موفقیت ثبت شد',
        payment: updatedPayment,
        orderPaymentStatus: PaymentStatus.REFUNDED,
      };
    });
  }

  async adminApplyRefundExecution(input: {
    actorUserId: number;
    orderId: number;
    amount?: number;
    reason: string;
    note?: string;
  }) {
    const order = await this.getOrderForPayment(input.orderId);

    if (order.paymentMethod !== PaymentMethod.ONLINE) {
      throw new BadRequestException('execution refund فقط برای سفارش آنلاین پشتیبانی شده است');
    }

    if (!order.payment) {
      throw new NotFoundException('payment متناظر با این سفارش یافت نشد');
    }

    const payment = await this.getPaymentOrThrow(order.payment.id);

    if (
      payment.status !== PaymentStatus.PAID &&
      payment.status !== PaymentStatus.PARTIALLY_REFUNDED
    ) {
      throw new BadRequestException('فقط payment پرداخت‌شده یا partially refunded قابل refund است');
    }

    if (
      payment.order.paymentStatus !== PaymentStatus.PAID &&
      payment.order.paymentStatus !== PaymentStatus.PARTIALLY_REFUNDED
    ) {
      throw new BadRequestException('وضعیت پرداخت order برای refund execution معتبر نیست');
    }

    const totalAmount = this.roundMoney(Number(payment.amount));
    const alreadyRefundedAmount = this.roundMoney(Number(payment.refundedAmount));
    const remainingRefundableAmount = this.roundMoney(totalAmount - alreadyRefundedAmount);

    if (remainingRefundableAmount <= 0) {
      throw new ConflictException('این payment قبلا به طور کامل refund شده است');
    }

    const refundAmount = this.roundMoney(input.amount ?? remainingRefundableAmount);

    if (refundAmount <= 0 || refundAmount > remainingRefundableAmount) {
      throw new BadRequestException('مبلغ refund نامعتبر است');
    }

    const nextRefundedAmount = this.roundMoney(alreadyRefundedAmount + refundAmount);
    const fullyRefunded = nextRefundedAmount === totalAmount;

    return this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: fullyRefunded ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED,
          refundedAmount: {
            increment: refundAmount,
          },
          reviewStatus: PaymentReviewStatus.RESOLVED,
          reviewReason: input.reason,
          reviewNote: input.note ?? payment.reviewNote,
          reviewedAt: new Date(),
          reviewedByUserId: input.actorUserId,
          rawVerifyData: this.toInputJson({
            ...(this.ensureJsonObject(payment.rawVerifyData)),
            refundExecutions: [
              ...this.ensureJsonArray(
                this.ensureJsonObject(payment.rawVerifyData).refundExecutions,
              ),
              {
                refundAmount,
                reason: input.reason,
                note: input.note ?? null,
                refundedAt: new Date().toISOString(),
                refundedByUserId: input.actorUserId,
                full: fullyRefunded,
              },
            ],
          }),
        },
        include: this.getPaymentInclude(),
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: fullyRefunded ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED,
          paymentRefundedAmount: {
            increment: refundAmount,
          },
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: payment.orderId,
          fromStatus: payment.order.status,
          toStatus: payment.order.status,
          actorType: OrderActorType.ADMIN,
          actorUserId: input.actorUserId,
          reason: input.reason,
          note:
            input.note ??
            (fullyRefunded
              ? 'refund کامل برای payment ثبت شد'
              : 'refund جزئی برای payment ثبت شد'),
        },
      });

      return {
        payment: updatedPayment,
        orderPaymentStatus: fullyRefunded ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED,
        refundAmount,
        fullyRefunded,
      };
    });
  }

  async handleGatewayCallback(
    gatewayKey: string,
    payload: Record<string, unknown>,
    query: Record<string, string | string[] | undefined>,
    response?: Response,
  ) {
    const gatewayConfig = await this.paymentGatewayService.resolveGatewaySelection({
      gatewayKey,
    });

    const callbackPayload = {
      ...query,
      ...payload,
    } as Record<string, unknown>;

    const authority = this.extractStringValue(callbackPayload, ['authority', 'Authority']);
    const paymentId = this.extractNumericValue(payload, ['paymentId', 'PaymentId']);

    let payment: Awaited<ReturnType<PaymentService['getPaymentOrThrow']>> | null = null;
    if (paymentId) {
      payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: this.getPaymentInclude(),
      });
    } else if (authority) {
      payment = await this.prisma.payment.findUnique({
        where: { authority },
        include: this.getPaymentInclude(),
      });
    }

    if (payment) {
      await this.expirePaymentIfNeeded(payment.id);
      const refreshedPayment = await this.getPaymentOrThrow(payment.id);

      const status = this.extractStringValue(callbackPayload, ['Status', 'status']);
      const isSuccess = status?.toUpperCase() === 'OK';
      const refId = this.extractStringValue(callbackPayload, ['RefID', 'ref_id', 'refId']);

      if (gatewayConfig.driver === 'zarinpal' && authority && isSuccess) {
        const adapter = this.paymentGatewayRegistry.getAdapter(gatewayConfig.driver);
        const verificationResult = await adapter.verify({
          payment: refreshedPayment,
          refId: refId ?? undefined,
          success: isSuccess,
        });

        const nextOrderPaymentStatus = verificationResult.success
          ? PaymentStatus.PAID
          : PaymentStatus.FAILED;
        const nextOrderStatus = verificationResult.success
          ? refreshedPayment.order.status === OrderStatus.PENDING
            ? OrderStatus.PAID
            : refreshedPayment.order.status
          : OrderStatus.PENDING;

        await this.prisma.$transaction([
          this.prisma.payment.update({
            where: { id: refreshedPayment.id },
            data: {
              status: nextOrderPaymentStatus,
              refId: verificationResult.refId ?? null,
              failureReason: verificationResult.failureReason ?? null,
              verifiedAt: verificationResult.success ? new Date() : null,
              rawVerifyData: this.toInputJson({
                callbackReceivedAt: new Date().toISOString(),
                gatewayKey,
                authority,
                payload: callbackPayload,
                verification: verificationResult.rawData ?? null,
              }),
            },
          }),
          this.prisma.order.update({
            where: { id: refreshedPayment.orderId },
            data: {
              paymentStatus: nextOrderPaymentStatus,
              status: nextOrderStatus,
            },
          }),
          ...(verificationResult.success && refreshedPayment.order.status === OrderStatus.PENDING
            ? [
                this.prisma.orderStatusHistory.create({
                  data: {
                    orderId: refreshedPayment.orderId,
                    fromStatus: refreshedPayment.order.status,
                    toStatus: OrderStatus.PAID,
                    actorType: OrderActorType.CUSTOMER,
                    actorUserId: refreshedPayment.userId,
                    note: `پرداخت آنلاین با ${gatewayConfig.displayName} تایید شد`,
                  },
                }),
              ]
            : []),
          this.prisma.domainEvent.create({
            data: {
              eventType: verificationResult.success
                ? DomainEventType.PAYMENT_SUCCEEDED
                : DomainEventType.PAYMENT_FAILED,
              aggregateType: 'payment',
              aggregateId: refreshedPayment.id,
              actorUserId: refreshedPayment.userId,
              storeId: refreshedPayment.order.storeId,
              orderId: refreshedPayment.orderId,
              paymentId: refreshedPayment.id,
              summary: verificationResult.success
                ? `پرداخت سفارش #${refreshedPayment.orderId} موفق شد`
                : `پرداخت سفارش #${refreshedPayment.orderId} ناموفق شد`,
              payload: this.toInputJson({
                refId: verificationResult.refId ?? null,
                failureReason: verificationResult.failureReason ?? null,
              }),
            },
          }),
        ]);

        if (response && gatewayConfig.returnUrl) {
          const target = new URL(gatewayConfig.returnUrl);
          target.searchParams.set('status', verificationResult.success ? 'PAID' : 'FAILED');
          target.searchParams.set('authority', authority);
          target.searchParams.set('orderId', String(refreshedPayment.orderId));
          if (verificationResult.refId) target.searchParams.set('refId', verificationResult.refId);
          if (verificationResult.failureReason) target.searchParams.set('message', verificationResult.failureReason);
          return response.redirect(target.toString());
        }

        return {
          received: true,
          gatewayKey: gatewayConfig.key,
          matchedPaymentId: payment.id,
          verified: verificationResult.success,
          message: verificationResult.success
            ? 'callback زرین‌پال دریافت و پرداخت تایید شد'
            : 'callback زرین‌پال دریافت شد اما verify ناموفق بود',
        };
      }

      await this.prisma.payment.update({
        where: { id: refreshedPayment.id },
        data: {
          rawVerifyData: this.toInputJson({
            callbackReceivedAt: new Date().toISOString(),
            gatewayKey,
            authority: authority ?? null,
            payload: callbackPayload,
          }),
        },
      });
    }

    if (response && gatewayConfig.returnUrl) {
      const target = new URL(gatewayConfig.returnUrl);
      target.searchParams.set('status', 'FAILED');
      if (authority) target.searchParams.set('authority', authority);
      if (payment?.orderId) target.searchParams.set('orderId', String(payment.orderId));
      target.searchParams.set('message', payment ? 'پرداخت تایید نشد' : 'callback دریافت شد اما payment متناظر پیدا نشد');
      return response.redirect(target.toString());
    }

    return {
      received: true,
      gatewayKey: gatewayConfig.key,
      matchedPaymentId: payment?.id ?? null,
      message: payment
        ? 'callback دریافت و به payment متناظر متصل شد'
        : 'callback دریافت شد اما payment متناظر به صورت خودکار پیدا نشد',
    };
  }

  private async getOrderForPayment(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payment: true,
        store: {
          select: {
            vendorHealthStatus: true,
            vendorHealthSnapshot: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('سفارش مورد نظر برای payment یافت نشد');
    }

    const riskPolicy = this.extractRiskPolicy(order.store?.vendorHealthSnapshot ?? null);
    if (riskPolicy.manualReviewRequired) {
      throw new BadRequestException('پرداخت براي اين فروشنده نياز به بررسي دستي دارد و فعلا غيرفعال است');
    }

    return order;
  }

  private async getPaymentOrThrow(id: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: this.getPaymentInclude(),
    });

    if (!payment) {
      throw new NotFoundException('payment مورد نظر یافت نشد');
    }

    return payment;
  }

  private getPaymentInclude() {
    return {
      gatewayConfig: true,
      order: {
        select: {
          id: true,
          userId: true,
          status: true,
          paymentStatus: true,
          paymentMethod: true,
          totalAmount: true,
          storeId: true,
          storeName: true,
          storeSlug: true,
          store: {
            select: {
              ownerId: true,
            },
          },
          domainEvents: {
            orderBy: { createdAt: 'desc' as const },
          },
        },
      },
      user: {
        select: {
          id: true,
          phoneNumber: true,
          fullName: true,
        },
      },
      domainEvents: {
        orderBy: { createdAt: 'desc' as const },
      },
    };
  }

  private extractRiskPolicy(snapshot: Prisma.JsonValue | null) {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      return { manualReviewRequired: false };
    }

    const effective = (snapshot as Record<string, unknown>).riskPolicyEffective;
    if (!effective || typeof effective !== 'object' || Array.isArray(effective)) {
      return { manualReviewRequired: false };
    }

    return {
      manualReviewRequired: Boolean((effective as Record<string, unknown>).manualReviewRequired),
    };
  }

  private buildGatewaySnapshot(config: {
    id: number;
    key: string;
    displayName: string;
    driver: string;
    sandboxMode: boolean;
  }) {
    return {
      id: config.id,
      key: config.key,
      displayName: config.displayName,
      driver: config.driver,
      sandboxMode: config.sandboxMode,
    };
  }

  private toInputJson(value: Record<string, unknown>) {
    return value as Prisma.InputJsonValue;
  }

  private ensureJsonObject(value: Prisma.JsonValue | null) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, unknown>;
  }

  private ensureJsonArray(value: unknown) {
    return Array.isArray(value) ? value : [];
  }

  private async expirePaymentIfNeeded(paymentId: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          include: {
            orderItems: true,
          },
        },
      },
    });

    if (!payment || payment.status !== PaymentStatus.PENDING || !this.isExpired(payment.expiresAt)) {
      return false;
    }

    const restoredQuantities = new Map<number, number>();
    for (const item of payment.order.orderItems) {
      restoredQuantities.set(
        item.productId,
        (restoredQuantities.get(item.productId) ?? 0) + item.quantity,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.EXPIRED,
          failureReason: 'مهلت پرداخت به پایان رسید',
          rawVerifyData: this.toInputJson({
            expiredAt: new Date().toISOString(),
            reason: 'payment window expired',
          }),
        },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          status: OrderStatus.CANCELLED,
          paymentStatus: PaymentStatus.EXPIRED,
          cancelledAt: new Date(),
        },
      });

      for (const [productId, quantity] of restoredQuantities.entries()) {
        await tx.product.update({
          where: { id: productId },
          data: {
            quantity: {
              increment: quantity,
            },
          },
        });
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: payment.orderId,
          fromStatus: payment.order.status,
          toStatus: OrderStatus.CANCELLED,
          actorType: OrderActorType.SYSTEM,
          reason: 'مهلت پرداخت سفارش به پایان رسید',
          note: 'به علت انقضای payment، موجودی رزروشده آزاد شد',
        },
      });
      await this.domainEvents.record(tx, {
        eventType: DomainEventType.PAYMENT_EXPIRED,
        aggregateType: 'payment',
        aggregateId: payment.id,
        storeId: payment.order.storeId,
        orderId: payment.orderId,
        paymentId: payment.id,
        summary: `payment #${payment.id} منقضی شد`,
        payload: {
          previousOrderStatus: payment.order.status,
          nextOrderStatus: OrderStatus.CANCELLED,
        },
      });
    });

    return true;
  }

  private isExpired(expiresAt: Date | null) {
    return !!expiresAt && expiresAt.getTime() <= Date.now();
  }

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private readPositiveIntConfig(
    config: Prisma.JsonValue | null,
    key: string,
    fallback: number,
  ) {
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      return fallback;
    }

    const rawValue = (config as Record<string, unknown>)[key];
    const numericValue =
      typeof rawValue === 'number'
        ? rawValue
        : typeof rawValue === 'string'
          ? Number(rawValue)
          : NaN;

    return Number.isInteger(numericValue) && numericValue > 0
      ? numericValue
      : fallback;
  }

  private extractStringValue(
    payload: Record<string, unknown>,
    keys: string[],
  ) {
    for (const key of keys) {
      const value = payload[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }

    return null;
  }

  private extractNumericValue(
    payload: Record<string, unknown>,
    keys: string[],
  ) {
    for (const key of keys) {
      const value = payload[key];
      if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
        return value;
      }
      if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value);
        if (Number.isInteger(parsed) && parsed > 0) {
          return parsed;
        }
      }
    }

    return null;
  }

  private async assertCanAccessOrderPayment(
    user: AuthenticatedUser,
    order: Awaited<ReturnType<PaymentService['getOrderForPayment']>>,
  ) {
    if (this.isAdmin(user)) {
      return;
    }

    const ability = await this.abilityFactory.createForUser(user);
    if (order.userId === user.id && ability.can('read', subject('Order', { userId: user.id }))) {
      return;
    }

    throw new ForbiddenException('شما اجازه دسترسی به payment این سفارش را ندارید');
  }

  private async assertCanAccessPayment(
    user: AuthenticatedUser,
    payment: Awaited<ReturnType<PaymentService['getPaymentOrThrow']>>,
  ) {
    if (this.isAdmin(user)) {
      return;
    }

    const ability = await this.abilityFactory.createForUser(user);
    if (payment.userId === user.id && ability.can('read', subject('Order', { userId: user.id }))) {
      return;
    }

    throw new ForbiddenException('شما اجازه مشاهده این payment را ندارید');
  }

  private isAdmin(user: AuthenticatedUser) {
    return user.roles.includes('ADMIN');
  }

  private assertAdmin(user: AuthenticatedUser) {
    if (!this.isAdmin(user)) {
      throw new ForbiddenException('این endpoint فقط برای ادمین مجاز است');
    }
  }

  private isTerminalOrderStatus(status: OrderStatus) {
    const terminalStatuses: OrderStatus[] = [
      OrderStatus.DELIVERED,
      OrderStatus.REJECTED_BY_VENDOR,
      OrderStatus.CANCELLED,
      OrderStatus.CANCELLED_BY_ADMIN,
      OrderStatus.CANCELLED_BY_CUSTOMER,
    ];

    return terminalStatuses.includes(status);
  }
}
