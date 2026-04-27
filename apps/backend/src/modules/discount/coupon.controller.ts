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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { CouponService } from './coupon.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { GetCouponsQueryDto } from './dto/get-coupons-query.dto';

@ApiTags('Coupons')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('coupons/admin')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Post()
  @ApiOperation({ summary: 'ایجاد coupon توسط ادمین' })
  create(
    @GetUser() user: { id: number; roles: string[] },
    @Body() dto: CreateCouponDto,
  ) {
    return this.couponService.adminCreate(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'لیست couponها برای ادمین' })
  findAll(
    @GetUser() user: { id: number; roles: string[] },
    @Query() query: GetCouponsQueryDto,
  ) {
    return this.couponService.adminList(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'جزئیات coupon برای ادمین' })
  findOne(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.couponService.adminFindOne(user, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش coupon توسط ادمین' })
  update(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCouponDto,
  ) {
    return this.couponService.adminUpdate(user, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف coupon توسط ادمین' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.couponService.adminRemove(user, id);
  }
}
