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
  ParseIntPipe 
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { GetProductsQueryDto } from './dto/get-products-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateElementDto } from './dto/create-element.dto';
import { Role } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

@ApiTags('Catalog - Products') // نام دسته‌بندی در صفحه Swagger
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // ۱. ایجاد محصول - فقط ادمین و فروشنده
  @Post()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'ایجاد محصول جدید' }) // توضیح فارسی برای متد
  @ApiResponse({ status: 201, description: 'محصول با موفقیت ایجاد شد.' })
  @Roles(Role.ADMIN, Role.VENDOR)
  async create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }

  // ۲. لیست محصولات با فیلتر و صفحه‌بندی (عمومی)
  @Get()  
  @ApiOperation({ summary: 'دریافت لیست محصولات با فیلتر و صفحه‌بندی' })
  async findAll(@Query() query: GetProductsQueryDto) {
    return this.productService.findAll(query);
  }

  // ۳. جزئیات محصول بر اساس اسلاگ (عمومی برای SEO)
  @Get(':slug')
  @ApiOperation({ summary: 'دریافت جزئیات یک محصول' })
  async findOne(@Param('slug') slug: string) {
    return this.productService.findOne(slug);
  }

  // ۴. به‌روزرسانی محصول - ادمین و فروشنده
  @Patch(':id')
  @ApiOperation({ summary: 'دریافت جزئیات یک محصول' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'ویرایش محصول' })
  @Roles(Role.ADMIN, Role.VENDOR)
  async update(
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateProductDto: UpdateProductDto
  ) {
    return this.productService.update(id, updateProductDto);
  }

  // ۵. حذف محصول - فقط ادمین
  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'حذف محصول' })
  @Roles(Role.ADMIN)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.productService.remove(id);
  }

  // ۶. مدیریت المان‌ها (Product Elements)

  @Post('elements')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN) // محدود کردن به ادمین
  @ApiOperation({ summary: 'ایجاد یک المان جدید (مثلا متریال)' })
  async createElement(@Body() dto: CreateElementDto) {
    // اصلاح شد: استفاده از productService به جای catalogService
    return this.productService.createElement(dto);
  }

  @Get('elements')
  @ApiOperation({ summary: 'دریافت تمام المان‌ها' })
  async findAllElements() {
    return this.productService.findAllElements();
  }

  @Delete('elements/:id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'حذف یک المان' })
  async removeElement(@Param('id', ParseIntPipe) id: number) {
    return this.productService.removeElement(id);
  }
}

