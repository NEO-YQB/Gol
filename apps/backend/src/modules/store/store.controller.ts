import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StoreService } from './store.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { AdminUpdateStoreDto, UpdateStoreDto } from './dto/update-store.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'; // اصلاح مسیر مطابق ساختار پروژه شما
import { GetUser } from '../../common/decorators/get-user.decorator';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { AbilitiesGuard } from '../../common/guards/abilities.guard';
import { CheckAbilities } from '../../common/decorators/check-abilities.decorator';
import { VendorHealthService } from './vendor-health.service';
import { AdminListVendorHealthQueryDto } from './dto/admin-list-vendor-health-query.dto';
import { AdminUpsertVendorRiskPolicyDto } from './dto/admin-upsert-vendor-risk-policy.dto';

@ApiTags('Stores')
@Controller('stores')
export class StoreController {
  constructor(
    private readonly storeService: StoreService,
    private readonly vendorHealthService: VendorHealthService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'ایجاد فروشگاه' })
  @ApiOkResponse({
    description: 'فروشگاه با موفقیت ایجاد شد',
    schema: {
      example: {
        id: 3,
        name: 'رز آبی',
        slug: 'blue-rose',
        ownerId: 12,
        isVerified: false,
      },
    },
  })
  @CheckAbilities((ability) => ability.can('create', 'Store'))
  create(
    @Body() createStoreDto: CreateStoreDto,
    @GetUser() user: { id: number; roles: string[] },
  ) {
    return this.storeService.create(createStoreDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'دریافت لیست فروشگاه ها' })
  @ApiOkResponse({
    description: 'لیست فروشگاه‌ها',
    schema: {
      example: [
        { id: 3, name: 'رز آبی', slug: 'blue-rose', isVerified: true },
      ],
    },
  })
  findAll() {
    return this.storeService.findAll();
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'ویرایش فروشگاه' })
  @ApiParam({ name: 'id', type: Number, description: 'شناسه فروشگاه' })
  @CheckAbilities((ability) => ability.can('manage', 'all') || ability.can('update', 'Store'))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStoreDto: AdminUpdateStoreDto,
    @GetUser() user: { id: number; roles: string[] },
  ) {
    return this.storeService.update(id, updateStoreDto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'حذف فروشگاه' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', type: Number, description: 'شناسه فروشگاه' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: { id: number; roles: string[] },
  ) {
    await this.storeService.remove(id, user);
  }

  @Get('admin/vendor-health')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'لیست health score فروشنده‌ها برای ادمین' })
  adminListVendorHealth(
    @GetUser() user: { id: number; roles: string[] },
    @Query() query: AdminListVendorHealthQueryDto,
  ) {
    return this.vendorHealthService.adminListVendorHealth(user, query);
  }

  @Get('admin/:id/vendor-health')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'جزئیات health score یک فروشگاه برای ادمین' })
  @ApiParam({ name: 'id', type: Number, description: 'شناسه فروشگاه' })
  adminGetVendorHealth(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.vendorHealthService.adminGetVendorHealth(user, id);
  }

  @Post('admin/:id/vendor-health/recalculate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'محاسبه مجدد health score فروشگاه توسط ادمین' })
  @ApiParam({ name: 'id', type: Number, description: 'شناسه فروشگاه' })
  adminRecalculateVendorHealth(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.vendorHealthService.adminRecalculateVendorHealth(user, id);
  }

  @Patch('admin/:id/risk-policy')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'ثبت يا override policy ريسک فروشنده توسط ادمين' })
  @ApiParam({ name: 'id', type: Number, description: 'شناسه فروشگاه' })
  adminUpsertVendorRiskPolicy(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminUpsertVendorRiskPolicyDto,
  ) {
    return this.vendorHealthService.adminUpsertVendorRiskPolicy(user, id, dto);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'دریافت جزئیات فروشگاه با اسلاگ' })
  @ApiParam({ name: 'slug', type: String, description: 'اسلاگ فروشگاه' })
  @ApiOkResponse({
    description: 'جزئیات فروشگاه',
    schema: {
      example: {
        id: 3,
        name: 'رز آبی',
        slug: 'blue-rose',
        customerRatingAverage: '4.75',
        customerRatingCount: 24,
      },
    },
  })
  findOne(@Param('slug') slug: string) {
    return this.storeService.findBySlug(slug);
  }
}
