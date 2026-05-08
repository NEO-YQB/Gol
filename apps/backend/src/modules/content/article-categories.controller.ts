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
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CheckAbilities } from '../../common/decorators/check-abilities.decorator';
import { AbilitiesGuard } from '../../common/guards/abilities.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ContentService } from './content.service';
import { CreateArticleCategoryDto } from './dto/create-article-category.dto';
import { UpdateArticleCategoryDto } from './dto/update-article-category.dto';

@ApiTags('Content - Article Categories')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, AbilitiesGuard)
@Controller('content/article-categories')
export class ArticleCategoriesController {
  constructor(private readonly contentService: ContentService) {}

  @Post()
  @CheckAbilities((ability) => ability.can('create', 'ArticleCategory'))
  @ApiOperation({ summary: 'ایجاد دسته‌بندی مقاله', description: 'ایجاد category مقاله با امکان اتصال به category والد برای ساختار pillar/cluster.' })
  @ApiBody({ type: CreateArticleCategoryDto })
  create(@Body() dto: CreateArticleCategoryDto) {
    return this.contentService.createArticleCategory(dto);
  }

  @Get()
  @CheckAbilities((ability) => ability.can('read', 'ArticleCategory'))
  @ApiOperation({ summary: 'دریافت لیست دسته‌بندی‌های مقاله', description: 'دریافت categoryها همراه با parent/children برای ساختار درختی محتوایی.' })
  findAll() {
    return this.contentService.findAllArticleCategories();
  }

  @Get(':id')
  @CheckAbilities((ability) => ability.can('read', 'ArticleCategory'))
  @ApiOperation({ summary: 'دریافت جزئیات دسته‌بندی مقاله', description: 'جزئیات category شامل parent، children و count مقاله‌های متصل.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.contentService.findArticleCategory(id);
  }

  @Patch(':id')
  @CheckAbilities((ability) => ability.can('update', 'ArticleCategory'))
  @ApiOperation({ summary: 'ویرایش دسته‌بندی مقاله', description: 'ویرایش category و parent آن. سیستم از self-parent و loop در درخت category جلوگیری می‌کند.' })
  @ApiBody({ type: UpdateArticleCategoryDto })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateArticleCategoryDto) {
    return this.contentService.updateArticleCategory(id, dto);
  }

  @Delete(':id')
  @CheckAbilities((ability) => ability.can('delete', 'ArticleCategory'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'حذف دسته‌بندی مقاله' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.contentService.removeArticleCategory(id);
  }
}
