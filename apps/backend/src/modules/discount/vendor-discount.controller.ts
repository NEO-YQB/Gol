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
import { VendorDiscountService } from './vendor-discount.service';
import { CreateVendorDiscountDto } from './dto/create-vendor-discount.dto';
import { UpdateVendorDiscountDto } from './dto/update-vendor-discount.dto';
import { GetVendorDiscountsQueryDto } from './dto/get-vendor-discounts-query.dto';

@ApiTags('Vendor Discounts')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('vendor-discounts')
export class VendorDiscountController {
  constructor(private readonly vendorDiscountService: VendorDiscountService) {}

  @Post()
  @ApiOperation({ summary: 'ایجاد تخفیف فروشنده برای محصول خودش' })
  create(
    @GetUser() user: { id: number; roles: string[] },
    @Body() dto: CreateVendorDiscountDto,
  ) {
    return this.vendorDiscountService.create(user, dto);
  }

  @Get('mine')
  @ApiOperation({ summary: 'دریافت لیست تخفیف‌های فروشنده یا ادمین' })
  findMine(
    @GetUser() user: { id: number; roles: string[] },
    @Query() query: GetVendorDiscountsQueryDto,
  ) {
    return this.vendorDiscountService.findMine(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'دریافت جزئیات یک vendor discount' })
  findOne(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.vendorDiscountService.findOne(user, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش vendor discount' })
  update(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVendorDiscountDto,
  ) {
    return this.vendorDiscountService.update(user, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف vendor discount' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.vendorDiscountService.remove(user, id);
  }
}
