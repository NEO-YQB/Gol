import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { FinanceService } from './finance.service';
import { CreateCommissionRuleDto } from './dto/create-commission-rule.dto';
import { UpdateCommissionRuleDto } from './dto/update-commission-rule.dto';
import { GetCommissionRulesQueryDto } from './dto/get-commission-rules-query.dto';
import { ManualWalletAdjustmentDto } from './dto/manual-wallet-adjustment.dto';

@ApiTags('Finance')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Post('admin/commission-rules')
  @ApiOperation({ summary: 'ایجاد قانون کمیسیون توسط ادمین' })
  createCommissionRule(
    @GetUser() user: { id: number; roles: string[] },
    @Body() dto: CreateCommissionRuleDto,
  ) {
    return this.financeService.adminCreateCommissionRule(user, dto);
  }

  @Get('admin/commission-rules')
  @ApiOperation({ summary: 'لیست قوانین کمیسیون' })
  listCommissionRules(
    @GetUser() user: { id: number; roles: string[] },
    @Query() query: GetCommissionRulesQueryDto,
  ) {
    return this.financeService.adminListCommissionRules(user, query);
  }

  @Get('admin/commission-rules/:id')
  @ApiOperation({ summary: 'جزئیات یک قانون کمیسیون' })
  getCommissionRule(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.financeService.adminGetCommissionRule(user, id);
  }

  @Patch('admin/commission-rules/:id')
  @ApiOperation({ summary: 'ویرایش قانون کمیسیون' })
  updateCommissionRule(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCommissionRuleDto,
  ) {
    return this.financeService.adminUpdateCommissionRule(user, id, dto);
  }

  @Delete('admin/commission-rules/:id')
  @ApiOperation({ summary: 'حذف قانون کمیسیون' })
  removeCommissionRule(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.financeService.adminDeleteCommissionRule(user, id);
  }

  @Get('admin/wallets')
  @ApiOperation({ summary: 'لیست کیف پول فروشگاه ها' })
  listWallets(@GetUser() user: { id: number; roles: string[] }) {
    return this.financeService.adminListWallets(user);
  }

  @Get('admin/wallets/store/:storeId')
  @ApiOperation({ summary: 'جزئیات کیف پول یک فروشگاه' })
  getWalletByStore(
    @GetUser() user: { id: number; roles: string[] },
    @Param('storeId', ParseIntPipe) storeId: number,
  ) {
    return this.financeService.adminGetWalletByStore(user, storeId);
  }

  @Post('admin/wallets/store/:storeId/adjustments')
  @ApiOperation({ summary: 'شارژ یا برداشت دستی کیف پول فروشگاه' })
  adjustWallet(
    @GetUser() user: { id: number; roles: string[] },
    @Param('storeId', ParseIntPipe) storeId: number,
    @Body() dto: ManualWalletAdjustmentDto,
  ) {
    return this.financeService.adminAdjustWallet(user, storeId, dto);
  }

  @Post('admin/orders/:orderId/release-settlement')
  @ApiOperation({ summary: 'آزادسازی دستی earning hold شده یک order' })
  releaseOrderSettlement(
    @GetUser() user: { id: number; roles: string[] },
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    return this.financeService.adminReleaseOrderSettlement(user, orderId);
  }

  @Post('admin/settlements/release-due')
  @ApiOperation({ summary: 'آزادسازی سفارش های hold شده که زمان auto release آن‌ها رسیده است' })
  releaseDueSettlements(@GetUser() user: { id: number; roles: string[] }) {
    return this.financeService.adminReleaseDueSettlements(user);
  }

  @Get('wallet/me')
  @ApiOperation({ summary: 'دریافت کیف پول فروشنده جاری' })
  getMyWallet(@GetUser() user: { id: number; roles: string[] }) {
    return this.financeService.vendorGetOwnWallet(user);
  }
}
