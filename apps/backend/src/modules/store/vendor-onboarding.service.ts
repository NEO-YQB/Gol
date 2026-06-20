import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, VendorOnboardingStatus } from '@prisma/client'
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
  productMainImage?: string
  productMainImageAlt?: string
  productGalleryImages?: string[]
  productGalleryAlts?: string[]
  productCategoryId?: number
  productTypeId?: number
  productPrice?: number
  productQuantity?: number
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
    return this.prisma.vendorOnboardingRequest.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
      include: {
        user: {
          select: {
            id: true,
            phoneNumber: true,
            fullName: true,
          },
        },
      },
    })
  }

  async submitApplication(user: AuthenticatedUser, dto: SubmitVendorOnboardingDto) {
    const request = await this.getOrCreateRequest(user.id)

    if (
      request.applicationStatus === VendorOnboardingStatus.SUBMITTED ||
      request.applicationStatus === VendorOnboardingStatus.UNDER_REVIEW ||
      request.applicationStatus === VendorOnboardingStatus.APPROVED
    ) {
      throw new ConflictException('درخواست شما قبلا ثبت شده و در حال بررسی است')
    }

    await this.ensureSlugAvailable(dto.businessSlug, request.id)

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          fullName: dto.personalFullName,
        },
      })

      return tx.vendorOnboardingRequest.update({
        where: { id: request.id },
        data: {
          applicationStatus: VendorOnboardingStatus.SUBMITTED,
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
        include: {
          user: {
            select: {
              id: true,
              phoneNumber: true,
              fullName: true,
            },
          },
        },
      })
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
        productStatus: VendorOnboardingStatus.SUBMITTED,
        productName: dto.productName,
        productDescription: this.buildProductDraftDescription(dto),
        productMainImage: dto.productMainImage ?? null,
        productCategoryId: dto.productCategoryId ?? request.productCategoryId,
        productTypeId: dto.productTypeId ?? request.productTypeId,
        productPrice: dto.productPrice !== undefined ? new Prisma.Decimal(dto.productPrice) : request.productPrice,
        productQuantity: dto.productQuantity ?? request.productQuantity,
        documents: this.mergeDocumentsWithGallery(request.documents, dto.productGalleryImages),
        productSubmittedAt: new Date(),
      },
    })
  }

  async adminListRequests(user: AuthenticatedUser, query: { status?: string; page?: number; limit?: number }) {
    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const skip = (page - 1) * limit

    const where: Prisma.VendorOnboardingRequestWhereInput = query.status
      ? { applicationStatus: query.status as VendorOnboardingStatus }
      : {}

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
    const request = await this.prisma.vendorOnboardingRequest.findUnique({ where: { id: requestId } })
    if (!request) {
      throw new NotFoundException('درخواست مورد نظر یافت نشد')
    }

    if (request.applicationStatus === 'APPROVED' || request.applicationStatus === 'REJECTED') {
      throw new ConflictException('این درخواست قبلا نهایی شده است')
    }

    const nextStatus = approved ? VendorOnboardingStatus.APPROVED : VendorOnboardingStatus.REJECTED

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.vendorOnboardingRequest.update({
        where: { id: requestId },
        data: {
          applicationStatus: nextStatus,
          reviewedAt: new Date(),
          reviewedByUserId: user.id,
          reviewNote: dto.reviewNote ?? null,
          storeActivatedAt: approved ? null : request.storeActivatedAt,
        },
      })

      if (approved) {
        const existingStore = await tx.store.findFirst({
          where: { ownerId: request.userId },
          select: { id: true },
        })

        if (!existingStore && request.businessName && request.businessSlug) {
          await tx.store.create({
            data: {
              name: request.businessName,
              slug: request.businessSlug,
              description: request.businessDescription ?? null,
              address: request.businessAddress ?? null,
              lat: request.businessLat ?? null,
              lng: request.businessLng ?? null,
              ownerId: request.userId,
              isVerified: false,
            },
          })
        }
      }

      return next
    })

    return updated
  }

  async adminReviewProduct(user: AuthenticatedUser, requestId: number, approved: boolean, dto: ReviewVendorProductDto) {
    const request = await this.prisma.vendorOnboardingRequest.findUnique({ where: { id: requestId } })
    if (!request) {
      throw new NotFoundException('درخواست مورد نظر یافت نشد')
    }

    const nextStatus = approved ? VendorOnboardingStatus.APPROVED : VendorOnboardingStatus.REJECTED

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.vendorOnboardingRequest.update({
        where: { id: requestId },
        data: {
          productStatus: nextStatus,
          productReviewedAt: new Date(),
          productReviewedByUserId: user.id,
          productReviewNote: dto.reviewNote ?? null,
          storeActivatedAt: approved ? new Date() : request.storeActivatedAt,
        },
      })

      if (approved) {
        const vendorRole = await tx.role.findUnique({
          where: { name: 'VENDOR' },
          select: { id: true },
        })
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

        const existingStore = await tx.store.findFirst({
          where: { ownerId: request.userId },
          select: { id: true },
        })

        if (!existingStore && request.businessName && request.businessSlug) {
          await tx.store.create({
            data: {
              name: request.businessName,
              slug: request.businessSlug,
              description: request.businessDescription ?? null,
              address: request.businessAddress ?? null,
              lat: request.businessLat ?? null,
              lng: request.businessLng ?? null,
              ownerId: request.userId,
              isVerified: false,
            },
          })
        }
      }

      return updated
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
    return documents && documents.length ? (documents as Prisma.InputJsonValue) : undefined
  }

  private mergeDocumentsWithGallery(existing: Prisma.JsonValue | null, gallery?: string[]) {
    const current = Array.isArray(existing) ? [...existing] : []
    const galleryDocs = (gallery ?? []).map((url) => ({ title: 'گالری محصول نمونه', url }))
    return [...current, ...galleryDocs] as Prisma.InputJsonValue
  }

  private buildProductDraftDescription(dto: SubmitVendorProductDto) {
    const parts = [dto.productDescription?.trim() || '']

    if (dto.productMainImageAlt?.trim()) {
      parts.push(`ALT تصویر اصلی: ${dto.productMainImageAlt.trim()}`)
    }

    if (dto.productGalleryAlts?.length) {
      const galleryLines = dto.productGalleryAlts
        .map((item, index) => item?.trim() ? `ALT گالری ${index + 1}: ${item.trim()}` : '')
        .filter(Boolean)
      parts.push(...galleryLines)
    }

    return parts.filter(Boolean).join('\n')
  }
}
