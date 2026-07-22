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
import { CategoryService } from './category.service';
import { CreateCategoryFaqDto } from './dto/create-category-faq.dto';
import { UpdateCategoryFaqDto } from './dto/update-category-faq.dto';
import { ReorderCategoryFaqDto } from './dto/reorder-category-faq.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AbilitiesGuard } from '../../common/guards/abilities.guard';
import { CheckAbilities } from '../../common/decorators/check-abilities.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

@ApiTags('Catalog - Category FAQs')
@Controller('categories/:categoryId/faqs')
export class CategoryFaqController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @ApiOperation({ summary: 'ایجاد سوال متداول برای دسته‌بندی' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ status: 201, description: 'سوال متداول با موفقیت ایجاد شد.' })
  @CheckAbilities((ability) => ability.can('update', 'Category'))
  create(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Body() dto: CreateCategoryFaqDto,
  ) {
    return this.categoryService.createFaq(categoryId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'دریافت لیست سوالات متداول یک دسته‌بندی' })
  findAll(@Param('categoryId', ParseIntPipe) categoryId: number) {
    return this.categoryService.findFaqs(categoryId);
  }

  @Patch(':faqId')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @ApiOperation({ summary: 'ویرایش سوال متداول' })
  @ApiBearerAuth('JWT-auth')
  @CheckAbilities((ability) => ability.can('update', 'Category'))
  update(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Param('faqId', ParseIntPipe) faqId: number,
    @Body() dto: UpdateCategoryFaqDto,
  ) {
    return this.categoryService.updateFaq(categoryId, faqId, dto);
  }

  @Delete(':faqId')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'حذف سوال متداول' })
  @ApiBearerAuth('JWT-auth')
  @CheckAbilities((ability) => ability.can('update', 'Category'))
  async remove(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Param('faqId', ParseIntPipe) faqId: number,
  ) {
    await this.categoryService.removeFaq(categoryId, faqId);
  }

  @Patch('reorder')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @ApiOperation({ summary: 'مرتب‌سازی سوالات متداول' })
  @ApiBearerAuth('JWT-auth')
  @CheckAbilities((ability) => ability.can('update', 'Category'))
  reorder(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Body() dto: ReorderCategoryFaqDto,
  ) {
    return this.categoryService.reorderFaqs(categoryId, dto);
  }
}
