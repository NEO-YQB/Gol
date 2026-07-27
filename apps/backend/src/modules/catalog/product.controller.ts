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
import { ReviewProductDto } from './dto/review-product.dto';
import { PublishProductDto } from './dto/publish-product.dto';
import { ToggleProductPurchasableDto } from './dto/toggle-product-purchasable.dto';
import { DeleteProductDto } from './dto/delete-product.dto';
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

  @Post('elements')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @CheckAbilities((ability) => ability.can('create', 'ProductElement'))
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
  @CheckAbilities((ability) => ability.can('delete', 'ProductElement'))
  @ApiOperation({ summary: 'حذف یک المان' })
  async removeElement(@Param('id', ParseIntPipe) id: number) {
    return this.productService.removeElement(id);
  }

  @Get()  
  @ApiOperation({ summary: 'دریافت لیست محصولات با فیلتر و صفحه‌بندی' })
  async findAll(@Query() query: GetProductsQueryDto) {
    return this.productService.findAll(query);
  }

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

  @Patch(':id/review')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @CheckAbilities((ability) => ability.can('manage', 'all') || ability.can('review', 'Product'))
  @ApiOperation({ summary: 'بازبینی ادمینی محصول و تایید/بازگشت برای اصلاح' })
  async review(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ReviewProductDto,
    @GetUser() user: { id: number; roles: string[] },
  ) {
    return this.productService.review(id, body, user);
  }

  @Patch(':id/publish')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @CheckAbilities((ability) => ability.can('manage', 'all') || ability.can('publish', 'Product'))
  @ApiOperation({ summary: 'انتشار یا خروج از انتشار محصول توسط ادمین' })
  async publish(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: PublishProductDto,
    @GetUser() user: { id: number; roles: string[] },
  ) {
    return this.productService.publish(id, body, user);
  }

  @Patch(':id/purchasable')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'فعال/غیرفعال کردن قابلیت خرید محصول بدون حذف از لیست' })
  async togglePurchasable(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ToggleProductPurchasableDto,
    @GetUser() user: { id: number; roles: string[] },
  ) {
    return this.productService.togglePurchasable(id, body, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT) 
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'حذف محصول' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: DeleteProductDto,
    @GetUser() user: { id: number; roles: string[] },
  ) {
    return this.productService.remove(id, user, body);
  }

  @Get('admin/by-slug/:slug')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'دریافت جزئیات محصول برای ادمین/پنل حتی در حالت آرشیو' })
  async findOneForAdmin(
    @Param('slug') slug: string,
    @GetUser() user: { id: number; roles: string[] },
  ) {
    return this.productService.findOneForAdmin(slug, user);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'دریافت جزئیات یک محصول' })
  async findOne(@Param('slug') slug: string) {
    return this.productService.findOne(slug);
  }
}
