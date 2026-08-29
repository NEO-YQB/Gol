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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AbilitiesGuard } from '../../common/guards/abilities.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CheckAbilities } from '../../common/decorators/check-abilities.decorator';
import { ProductTypeService } from './product-type.service';
import { CreateProductTypeFaqDto } from './dto/create-product-type-faq.dto';
import { UpdateProductTypeFaqDto } from './dto/update-product-type-faq.dto';
import { ReorderProductTypeFaqDto } from './dto/reorder-product-type-faq.dto';

@ApiTags('Catalog - Product Type FAQs')
@Controller('product-types/:productTypeId/faqs')
export class ProductTypeFaqController {
  constructor(private readonly productTypeService: ProductTypeService) {}

  @Post()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @CheckAbilities((ability) => ability.can('update', 'ProductType'))
  @ApiOperation({ summary: 'ایجاد سوال متداول برای نوع محصول' })
  @ApiResponse({ status: 201, description: 'سوال متداول با موفقیت ایجاد شد.' })
  create(@Param('productTypeId', ParseIntPipe) productTypeId: number, @Body() dto: CreateProductTypeFaqDto) {
    return this.productTypeService.createFaq(productTypeId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'دریافت لیست سوالات متداول نوع محصول' })
  findAll(@Param('productTypeId', ParseIntPipe) productTypeId: number) {
    return this.productTypeService.findFaqs(productTypeId);
  }

  @Patch(':faqId')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @CheckAbilities((ability) => ability.can('update', 'ProductType'))
  @ApiOperation({ summary: 'ویرایش سوال متداول نوع محصول' })
  update(
    @Param('productTypeId', ParseIntPipe) productTypeId: number,
    @Param('faqId', ParseIntPipe) faqId: number,
    @Body() dto: UpdateProductTypeFaqDto,
  ) {
    return this.productTypeService.updateFaq(productTypeId, faqId, dto);
  }

  @Delete(':faqId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @CheckAbilities((ability) => ability.can('update', 'ProductType'))
  async remove(
    @Param('productTypeId', ParseIntPipe) productTypeId: number,
    @Param('faqId', ParseIntPipe) faqId: number,
  ) {
    await this.productTypeService.removeFaq(productTypeId, faqId);
  }

  @Patch('reorder')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @CheckAbilities((ability) => ability.can('update', 'ProductType'))
  @ApiOperation({ summary: 'مرتب‌سازی سوالات متداول نوع محصول' })
  reorder(@Param('productTypeId', ParseIntPipe) productTypeId: number, @Body() dto: ReorderProductTypeFaqDto) {
    return this.productTypeService.reorderFaqs(productTypeId, dto);
  }
}
