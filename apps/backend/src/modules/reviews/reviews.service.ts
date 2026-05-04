import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DomainEventType, OrderStatus } from '@prisma/client';
import { subject } from '@casl/ability';
import { DomainEventsService } from '../../common/services/domain-events.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AbilityFactory } from '../auth/ability.factory';
import { VendorHealthService } from '../store/vendor-health.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { GetMyReviewsQueryDto } from './dto/get-my-reviews-query.dto';

type AuthenticatedUser = {
  id: number;
  roles: string[];
};

const REVIEW_TX_OPTIONS = {
  maxWait: 10_000,
  timeout: 20_000,
} as const;

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventsService,
    private readonly abilityFactory: AbilityFactory,
    private readonly vendorHealthService: VendorHealthService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateReviewDto) {
    const ability = await this.abilityFactory.createForUser(user);
    if (!ability.can('create', subject('Order', { userId: user.id }))) {
      throw new ForbiddenException('شما اجازه ثبت review را نداريد');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                storeId: true,
              },
            },
          },
        },
      },
    });

    if (!order || order.userId !== user.id) {
      throw new NotFoundException('سفارش مورد نظر براي ثبت review يافت نشد');
    }

    if (order.status !== OrderStatus.DELIVERED || !order.deliveredAt) {
      throw new BadRequestException('فقط براي سفارش تحويل شده امکان ثبت review وجود دارد');
    }

    const productIds = [...new Set(order.orderItems.map((item) => item.productId))];
    if (productIds.length !== 1) {
      throw new BadRequestException('در فاز فعلي review فقط براي سفارش تک محصولي پشتيباني مي شود');
    }

    const product = order.orderItems[0]?.product;
    if (!product?.storeId) {
      throw new BadRequestException('محصول review معتبر نيست');
    }

    const existingReview = await this.prisma.review.findUnique({
      where: { orderId: order.id },
      select: { id: true },
    });

    if (existingReview) {
      throw new BadRequestException('براي اين سفارش قبلا review ثبت شده است');
    }

    const review = await this.prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          userId: user.id,
          productId: product.id,
          orderId: order.id,
          rating: dto.rating,
          comment: dto.comment?.trim() || null,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              storeId: true,
            },
          },
        },
      });

      await this.domainEvents.record(tx, {
        eventType: DomainEventType.WALLET_ADJUSTED,
        aggregateType: 'review',
        aggregateId: created.id,
        actorUserId: user.id,
        storeId: product.storeId,
        orderId: order.id,
        summary: `review براي سفارش #${order.id} ثبت شد`,
        payload: {
          reviewId: created.id,
          productId: product.id,
          orderId: order.id,
          rating: dto.rating,
        },
      });

      return created;
    }, REVIEW_TX_OPTIONS);

    const health = await this.vendorHealthService.recalculateStoreHealth(product.storeId);

    await this.notificationsService.enqueue(this.prisma, {
      userId: user.id,
      storeId: product.storeId,
      orderId: order.id,
      topic: 'review.created',
      title: 'نظر شما ثبت شد',
      body: `نظر شما برای سفارش #${order.id} با موفقیت ثبت شد`,
      payload: {
        reviewId: review.id,
        orderId: order.id,
        rating: dto.rating,
      },
      dedupeKey: `review-created:${review.id}`,
    });

    return {
      message: 'review با موفقيت ثبت شد',
      review,
      vendorMetrics: {
        customerRatingAverage: health.customerRatingAverage,
        customerRatingCount: health.customerRatingCount,
        vendorHealthScore: health.vendorHealthScore,
        vendorHealthStatus: health.vendorHealthStatus,
        vendorHealthCalculatedAt: health.vendorHealthCalculatedAt,
      },
    };
  }

  async findMyReviews(user: AuthenticatedUser, query: GetMyReviewsQueryDto) {
    const ability = await this.abilityFactory.createForUser(user);
    if (!ability.can('read', subject('Order', { userId: user.id }))) {
      throw new ForbiddenException('شما اجازه مشاهده reviewهاي خود را نداريد');
    }

    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { userId: user.id },
        skip,
        take: limit,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              mainImage: true,
              store: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
      }),
      this.prisma.review.count({ where: { userId: user.id } }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }
}
