import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { GetUser } from '../../common/decorators/get-user.decorator'
import { VendorOnboardingService } from './vendor-onboarding.service'
import { IsArray, IsNumber, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { AbilitiesGuard } from '../../common/guards/abilities.guard'
import { CheckAbilities } from '../../common/decorators/check-abilities.decorator'

class VendorDocumentDto {
  @ApiProperty()
  @IsString()
  title!: string

  @ApiProperty()
  @IsString()
  url!: string
}

class SubmitVendorOnboardingDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  personalFullName!: string

  @ApiProperty()
  @IsString()
  personalNationalId!: string

  @ApiProperty()
  @IsString()
  @MinLength(3)
  businessName!: string

  @ApiProperty()
  @IsString()
  businessSlug!: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  businessDescription?: string

  @ApiProperty()
  @IsString()
  businessAddress!: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  businessLat?: number

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  businessLng?: number

  @ApiProperty()
  @IsString()
  licenseNumber!: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  licenseImageUrl?: string

  @ApiProperty({ required: false, type: [VendorDocumentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VendorDocumentDto)
  documents?: VendorDocumentDto[]
}

class SubmitVendorProductDto {
  @ApiProperty()
  @IsString()
  productName!: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  productDescription?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  productMainImage?: string

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productGalleryImages?: string[]

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  productCategoryId?: number

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  productTypeId?: number

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  productPrice?: number

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  productQuantity?: number
}

class ReviewDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reviewNote?: string
}

@ApiTags('Vendor Onboarding')
@Controller('vendor-onboarding')
export class VendorOnboardingController {
  constructor(private readonly vendorOnboardingService: VendorOnboardingService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'دریافت وضعیت onboarding فروشنده فعلی' })
  getMyRequest(@GetUser() user: { id: number; roles: string[] }) {
    return this.vendorOnboardingService.getMyRequest(user)
  }

  @Post('me/application')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'ثبت یا بروزرسانی درخواست فروشندگی' })
  submitApplication(@GetUser() user: { id: number; roles: string[] }, @Body() body: SubmitVendorOnboardingDto) {
    return this.vendorOnboardingService.submitApplication(user, body)
  }

  @Post('me/product')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'ثبت محصول اولیه برای بررسی محتوا و SEO' })
  submitProduct(@GetUser() user: { id: number; roles: string[] }, @Body() body: SubmitVendorProductDto) {
    return this.vendorOnboardingService.submitProduct(user, body)
  }

  @Get('admin/requests')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @ApiBearerAuth('JWT-auth')
  @CheckAbilities((ability) => ability.can('manage', 'all') || ability.can('read', 'VendorOnboardingRequest'))
  @ApiOperation({ summary: 'لیست درخواست‌های فروشندگی برای ادمین' })
  adminListRequests(
    @GetUser() user: { id: number; roles: string[] },
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.vendorOnboardingService.adminListRequests(user, {
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    })
  }

  @Get('admin/requests/:id')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @ApiBearerAuth('JWT-auth')
  @CheckAbilities((ability) => ability.can('manage', 'all') || ability.can('read', 'VendorOnboardingRequest'))
  @ApiOperation({ summary: 'جزئیات یک درخواست فروشندگی برای ادمین' })
  adminGetRequest(@GetUser() user: { id: number; roles: string[] }, @Param('id', ParseIntPipe) id: number) {
    return this.vendorOnboardingService.adminGetRequest(user, id)
  }

  @Patch('admin/requests/:id/application')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @ApiBearerAuth('JWT-auth')
  @CheckAbilities((ability) => ability.can('manage', 'all') || ability.can('review', 'VendorOnboardingRequest'))
  @ApiOperation({ summary: 'تایید یا رد درخواست فروشندگی' })
  adminReviewApplication(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { approved: boolean; reviewNote?: string },
  ) {
    return this.vendorOnboardingService.adminReviewApplication(user, id, Boolean(body.approved), { reviewNote: body.reviewNote })
  }

  @Patch('admin/requests/:id/product')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @ApiBearerAuth('JWT-auth')
  @CheckAbilities((ability) => ability.can('manage', 'all') || ability.can('review', 'VendorOnboardingRequest'))
  @ApiOperation({ summary: 'تایید یا رد محصول اولیه فروشنده' })
  adminReviewProduct(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { approved: boolean; reviewNote?: string },
  ) {
    return this.vendorOnboardingService.adminReviewProduct(user, id, Boolean(body.approved), { reviewNote: body.reviewNote })
  }
}
