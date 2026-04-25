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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@ApiTags('Cart')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'دریافت سبد خرید کاربر' })
  findMyCart(@GetUser() user: { id: number; roles: string[] }) {
    return this.cartService.getMyCart(user);
  }

  @Post('items')
  @ApiOperation({ summary: 'افزودن محصول به سبد خرید' })
  addItem(
    @GetUser() user: { id: number; roles: string[] },
    @Body() dto: AddCartItemDto,
  ) {
    return this.cartService.addItem(user, dto);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'ویرایش تعداد یک آیتم در سبد خرید' })
  updateItem(
    @GetUser() user: { id: number; roles: string[] },
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(user, itemId, dto);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'حذف یک آیتم از سبد خرید' })
  removeItem(
    @GetUser() user: { id: number; roles: string[] },
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.cartService.removeItem(user, itemId);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'خالی کردن کامل سبد خرید' })
  clear(@GetUser() user: { id: number; roles: string[] }) {
    return this.cartService.clear(user);
  }
}
