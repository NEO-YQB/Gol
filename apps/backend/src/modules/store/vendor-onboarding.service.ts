import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'

type AuthenticatedUser = {
  id: number
  roles: string[]
}

type SubmitVendorOnboardingDto = {
  personalFullName: string
  personalNationalId: string
  businessName: string
  businessSlug: string
  businessDescription?: string
  businessAddress: string
  businessLat?: number
  businessLng?: number
  licenseNumber: string
  licenseImageUrl?: string
  documents?: Array<{ title: string; url: string }>
}

type SubmitVendorProductDto = {
  productName: string
  productDescription?: string
  productCategoryId: number
  productTypeId: number
  productMainImage?: string
  productPrice: number
  productQuantity: number
}

type ReviewVendorOnboardingDto = {
  reviewNote?: string
}

type ReviewVendorProductDto = {
  reviewNote?: string
}

@Injectable()
export class VendorOnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyRequest(user: AuthenticatedUser) {
    return this.getOrCreateRequest(user.id)
  }

  async submitApplication(user: AuthenticatedUser, dto: SubmitVendorOnboardingDto) {
    const request = await this.getOrCreateRequest(user.id)

    if (request.applicationStatus === 'UNDER_REVIEW' || request.applicationStatus === 'APPROVED') {
      throw new ConflictException('درخواست شما قبلا ثبت شده و در حال بررسی است')
    }

    await this.ensureSlugAvailable(dto.businessSlug, request.id)

    return this.prisma.vendorOnboardingRequest.update({
      where: { id: request.id },
      data: {
        applicationStatus: 'SUBMITTED',
        personalFullName: dto.personalFullName,
        personalNationalId: dto.personalNationalId,
        businessName: dto.businessName,
        businessSlug: dto.businessSlug,
        businessDescription: dto.businessDescription ?? null,
        businessAddress: dto.businessAddress,
        businessLat: dto.businessLat ?? null,
        businessLng: dto.businessLng ?? null,
        licenseNumber: dto.licenseNumber,
        licenseImageUrl: dto.licenseImageUrl ?? null,
        documents: this.toJsonDocuments(dto.documents),
        submittedAt: new Date(),
      },
    })
  }

  async submitProduct(user: AuthenticatedUser, dto: SubmitVendorProductDto) {
    const request = await this.getOrCreateRequest(user.id)

    if (request.applicationStatus !== 'APPROVED') {
      throw new ConflictException('ابتدا باید درخواست فروشندگی تایید شود')
    }

    return this.prisma.vendorOnboardingRequest.update({
      where: { id: request.id },
      data: {
        productStatus: 'SUBMITTED',
        productName: dto.productName,
        productDescription: dto.productDescription ?? null,
        productCategoryId: dto.productCategoryId,
        productTypeId: dto.productTypeId,
        productMainImage: dto.productMainImage ?? null,
        productPrice: new Prisma.Decimal(dto.productPrice),
        productQuantity: dto.productQuantity,
        productSubmittedAt: new Date(),
      },
    })
  }

  async adminListRequests(user: AuthenticatedUser, query: { status?: string; page?: number; limit?: number }) {
    this.assertAdmin(user)
    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const skip = (page - 1) * limit

    const where = query.status ? { applicationStatus: query.status } : {}

    const [data, total] = await Promise.all([
      this.prisma.vendorOnboardingRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: { user: { select: { id: true, phoneNumber: true, fullName: true, roles: true } } },
      }),
      this.prisma.vendorOnboardingRequest.count({ where }),
    ])

    return { data, meta: { total, page, lastPage: Math.ceil(total / limit) } }
  }

  async adminGetRequest(user: AuthenticatedUser, requestId: number) {
    this.assertAdmin(user)

    const request = await this.prisma.vendorOnboardingRequest.findUnique({
      where: { id: requestId },
      include: { user: { select: { id: true, phoneNumber: true, fullName: true, roles: true } } },
    })

    if (!request) {
      throw new NotFoundException('درخواست مورد نظر یافت نشد')
    }

    return request
  }

  async adminReviewApplication(user: AuthenticatedUser, requestId: number, approved: boolean, dto: ReviewVendorOnboardingDto) {
    this.assertAdmin(user)

    const request = await this.prisma.vendorOnboardingRequest.findUnique({ where: { id: requestId } })
    if (!request) {
      throw new NotFoundException('درخواست مورد نظر یافت نشد')
    }

    if (request.applicationStatus === 'APPROVED' || request.applicationStatus === 'REJECTED') {
      throw new ConflictException('این درخواست قبلا نهایی شده است')
    }

    const nextStatus = approved ? 'APPROVED' : 'REJECTED'

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.vendorOnboardingRequest.update({
        where: { id: requestId },
        data: {
          applicationStatus: nextStatus,
          reviewedAt: new Date(),
          reviewedByUserId: user.id,
          reviewNote: dto.reviewNote ?? null,
          storeActivatedAt: approved ? new Date() : request.storeActivatedAt,
        },
      })

      if (approved) {
        const vendorRole = await tx.role.findUnique({ where: { name: 'VENDOR' }, select: { id: true } })
        if (vendorRole) {
          await tx.usersOnRoles.upsert({
            where: {
              userId_roleId: {
                userId: request.userId,
                roleId: vendorRole.id,
              },
            },
            update: {},
            create: {
              userId: request.userId,
              roleId: vendorRole.id,
            },
          })
        }
      }

      return next
    })

    return updated
  }

  async adminReviewProduct(user: AuthenticatedUser, requestId: number, approved: boolean, dto: ReviewVendorProductDto) {
    this.assertAdmin(user)

    const request = await this.prisma.vendorOnboardingRequest.findUnique({ where: { id: requestId } })
    if (!request) {
      throw new NotFoundException('درخواست مورد نظر یافت نشد')
    }

    const nextStatus = approved ? 'APPROVED' : 'REJECTED'

    return this.prisma.vendorOnboardingRequest.update({
      where: { id: requestId },
      data: {
        productStatus: nextStatus,
        productReviewedAt: new Date(),
        productReviewedByUserId: user.id,
        productReviewNote: dto.reviewNote ?? null,
      },
    })
  }

  private async getOrCreateRequest(userId: number) {
    return this.prisma.vendorOnboardingRequest.upsert({
      where: { userId },
      create: { userId },
      update: {},
    })
  }

  private async ensureSlugAvailable(slug: string, requestId?: number) {
    const existingStore = await this.prisma.store.findUnique({ where: { slug }, select: { id: true } })
    if (existingStore) {
      throw new ConflictException('این اسلاگ قبلا برای فروشگاه دیگری رزرو شده است')
    }

    const existingRequest = await this.prisma.vendorOnboardingRequest.findFirst({
      where: {
        businessSlug: slug,
        ...(requestId ? { NOT: { id: requestId } } : {}),
      },
      select: { id: true },
    })

    if (existingRequest) {
      throw new ConflictException('این اسلاگ قبلا در درخواست دیگری استفاده شده است')
    }
  }

  private toJsonDocuments(documents?: Array<{ title: string; url: string }>) {
    return documents && documents.length ? (documents as Prisma.InputJsonValue) : null
  }

  private assertAdmin(user: AuthenticatedUser) {
    if (!user.roles.includes('ADMIN')) {
      throw new ForbiddenException('این endpoint فقط برای ادمین مجاز است')
    }
  }
}
