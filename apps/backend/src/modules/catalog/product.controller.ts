import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Query, 
  ParseIntPipe,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { GetProductsQueryDto } from './dto/get-products-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateElementDto } from './dto/create-element.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { AbilitiesGuard } from '../../common/guards/abilities.guard';
import { CheckAbilities } from '../../common/decorators/check-abilities.decorator';

@ApiTags('Catalog - Products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // ۱. ایجاد محصول - فقط ادمین و فروشنده
  @Post()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'ایجاد محصول جدید' })
  @ApiResponse({ status: 201, description: 'محصول با موفقیت ایجاد شد.' })
  async create(
    @Body() createProductDto: CreateProductDto,
    @GetUser() user: { id: number; roles: string[] },
  ) {
    return this.productService.create(createProductDto, user);
  }

  // ۲. مدیریت المان‌ها (Product Elements)
  @Post('elements')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @CheckAbilities((ability) => ability.can('manage', 'all'))
  @ApiOperation({ summary: 'ایجاد یک المان جدید (مثلا متریال)' })
  async createElement(@Body() dto: CreateElementDto) {
    return this.productService.createElement(dto);
  }

  @Get('elements')
  @ApiOperation({ summary: 'دریافت تمام المان‌ها' })
  async findAllElements() {
    return this.productService.findAllElements();
  }

  @Delete('elements/:id')
  @HttpCode(HttpStatus.NO_CONTENT) 
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @CheckAbilities((ability) => ability.can('manage', 'all'))
  @ApiOperation({ summary: 'حذف یک المان' })
  async removeElement(@Param('id', ParseIntPipe) id: number) {
    return this.productService.removeElement(id);
  }

  // ۳. لیست محصولات با فیلتر و صفحه‌بندی (عمومی)
  @Get()  
  @ApiOperation({ summary: 'دریافت لیست محصولات با فیلتر و صفحه‌بندی' })
  async findAll(@Query() query: GetProductsQueryDto) {
    return this.productService.findAll(query);
  }

  // ۴. به‌روزرسانی محصول - ادمین و فروشنده
  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'ویرایش محصول' })
  async update(
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateProductDto: UpdateProductDto,
    @GetUser() user: { id: number; roles: string[] },
  ) {
    return this.productService.update(id, updateProductDto, user);
  }

  // ۵. حذف محصول - ادمین یا مالک فروشگاه
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT) 
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'حذف محصول' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: { id: number; roles: string[] },
  ) {
    return this.productService.remove(id, user);
  }

  // ۶. جزئیات محصول بر اساس اسلاگ (عمومی برای SEO)
  @Get(':slug')
  @ApiOperation({ summary: 'دریافت جزئیات یک محصول' })
  async findOne(@Param('slug') slug: string) {
    return this.productService.findOne(slug);
  }
}
