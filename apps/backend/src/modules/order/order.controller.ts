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
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderService } from './order.service';

@ApiTags('Orders')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

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

  @Get(':id')
  @ApiOperation({ summary: 'دریافت جزئیات یک سفارش' })
  findOne(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.orderService.findOne(user, id);
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'لغو سفارش در وضعیت مجاز' })
  cancel(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.orderService.cancel(user, id);
  }
}
