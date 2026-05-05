import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { CheckoutPreviewDto } from './dto/checkout-preview.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateOrderFromCartDto } from './dto/create-order-from-cart.dto';
import { OptionalOrderReasonDto } from './dto/optional-order-reason.dto';
import { OrderActionNoteDto } from './dto/order-action-note.dto';
import { OrderReasonDto } from './dto/order-reason.dto';
import { OrderService } from './order.service';

@ApiTags('Orders')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('preview')
  @ApiOperation({ summary: 'پیش نمایش checkout از روی سبد خرید' })
  @ApiOkResponse({
    description: 'پیش‌نمایش checkout از سبد خرید',
    schema: {
      example: {
        cartId: 4,
        payment: { paymentMethod: 'COD', paymentStatus: 'PENDING' },
        items: [],
        totalAmount: 850000,
      },
    },
  })
  preview(
    @GetUser() user: { id: number; roles: string[] },
    @Body() dto: CheckoutPreviewDto,
  ) {
    return this.orderService.previewFromCart(user, dto);
  }

  @Post('from-cart')
  @ApiOperation({ summary: 'ایجاد سفارش از روی سبد خرید' })
  @ApiOkResponse({
    description: 'سفارش با موفقیت از روی سبد خرید ایجاد شد',
    schema: {
      example: {
        id: 45,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        totalAmount: '850000',
      },
    },
  })
  createFromCart(
    @GetUser() user: { id: number; roles: string[] },
    @Body() dto: CreateOrderFromCartDto,
  ) {
    return this.orderService.createFromCart(user, dto);
  }

  @Post()
  @ApiOperation({ summary: 'ایجاد سفارش جدید' })
  @ApiBody({
    schema: {
      example: {
        items: [
          { productId: 1, quantity: 1 },
          { productId: 2, quantity: 2 },
        ],
      },
    },
  })
  @ApiOkResponse({
    description: 'سفارش جدید با موفقیت ایجاد شد',
    schema: {
      example: {
        id: 45,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        totalAmount: '850000',
      },
    },
  })
  create(
    @GetUser() user: { id: number; roles: string[] },
    @Body() dto: CreateOrderDto,
  ) {
    return this.orderService.create(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'دریافت سفارش های کاربر' })
  findAll(@GetUser() user: { id: number; roles: string[] }) {
    return this.orderService.findAll(user);
  }

  @Get('vendor')
  @ApiOperation({ summary: 'دریافت سفارش های فروشگاه فروشنده' })
  findVendorOrders(@GetUser() user: { id: number; roles: string[] }) {
    return this.orderService.findVendorOrders(user);
  }

  @Get('admin')
  @ApiOperation({ summary: 'دریافت همه سفارش ها برای ادمین' })
  findAdminOrders(@GetUser() user: { id: number; roles: string[] }) {
    return this.orderService.findAdminOrders(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'دریافت جزئیات یک سفارش' })
  @ApiParam({ name: 'id', type: Number, description: 'شناسه سفارش' })
  @ApiOkResponse({
    description: 'جزئیات کامل سفارش',
    schema: {
      example: {
        id: 45,
        status: 'DELIVERED',
        paymentStatus: 'PAID',
        items: [],
        timeline: [],
      },
    },
  })
  findOne(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.orderService.findOne(user, id);
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'لغو سفارش توسط مشتری یا ادمین در وضعیت مجاز' })
  @ApiParam({ name: 'id', type: Number, description: 'شناسه سفارش' })
  cancel(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: OptionalOrderReasonDto,
  ) {
    return this.orderService.cancel(user, id, dto);
  }

  @Patch(':id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'پذیرفتن سفارش توسط فروشنده یا ادمین' })
  @ApiParam({ name: 'id', type: Number, description: 'شناسه سفارش' })
  accept(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: OrderActionNoteDto,
  ) {
    return this.orderService.accept(user, id, dto);
  }

  @Patch(':id/ship')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ثبت ارسال سفارش توسط فروشنده یا ادمین' })
  @ApiParam({ name: 'id', type: Number, description: 'شناسه سفارش' })
  ship(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: OrderActionNoteDto,
  ) {
    return this.orderService.ship(user, id, dto);
  }

  @Patch(':id/deliver')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ثبت تحویل سفارش توسط فروشنده یا ادمین' })
  @ApiParam({ name: 'id', type: Number, description: 'شناسه سفارش' })
  deliver(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: OrderActionNoteDto,
  ) {
    return this.orderService.deliver(user, id, dto);
  }

  @Patch(':id/vendor-cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'لغو سفارش توسط فروشنده با دلیل اجباری' })
  @ApiParam({ name: 'id', type: Number, description: 'شناسه سفارش' })
  vendorCancel(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: OrderReasonDto,
  ) {
    return this.orderService.vendorCancel(user, id, dto);
  }
}
