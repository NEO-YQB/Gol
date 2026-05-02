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
import { UpdateStoreDto } from './dto/update-store.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'; // اصلاح مسیر مطابق ساختار پروژه شما
import { GetUser } from '../../common/decorators/get-user.decorator';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AbilitiesGuard } from '../../common/guards/abilities.guard';
import { CheckAbilities } from '../../common/decorators/check-abilities.decorator';
import { VendorHealthService } from './vendor-health.service';
import { AdminListVendorHealthQueryDto } from './dto/admin-list-vendor-health-query.dto';

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
  @CheckAbilities((ability) => ability.can('create', 'Store'))
  create(
    @Body() createStoreDto: CreateStoreDto,
    @GetUser() user: { id: number; roles: string[] },
  ) {
    return this.storeService.create(createStoreDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'دریافت لیست فروشگاه ها' })
  findAll() {
    return this.storeService.findAll();
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'ویرایش فروشگاه' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStoreDto: UpdateStoreDto,
    @GetUser() user: { id: number; roles: string[] },
  ) {
    return this.storeService.update(id, updateStoreDto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'حذف فروشگاه' })
  @HttpCode(HttpStatus.NO_CONTENT)
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
  adminRecalculateVendorHealth(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.vendorHealthService.adminRecalculateVendorHealth(user, id);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'دریافت جزئیات فروشگاه با اسلاگ' })
  findOne(@Param('slug') slug: string) {
    return this.storeService.findBySlug(slug);
  }
}
