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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AbilitiesGuard } from '../../common/guards/abilities.guard';
import { CheckAbilities } from '../../common/decorators/check-abilities.decorator';
import { ContentService } from './content.service';
import { CreateArticleFaqDto } from './dto/create-article-faq.dto';
import { UpdateArticleFaqDto } from './dto/update-article-faq.dto';
import { ReorderArticleFaqDto } from './dto/reorder-article-faq.dto';

@ApiTags('Content - Article FAQs')
@Controller('content/articles/:articleId/faqs')
export class ArticleFaqsController {
  constructor(private readonly contentService: ContentService) {}

  @Post()
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @ApiOperation({ summary: 'ایجاد سوال متداول برای مقاله' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ status: 201, description: 'سوال متداول با موفقیت ایجاد شد.' })
  @CheckAbilities((ability) => ability.can('update', 'Article'))
  create(
    @Param('articleId', ParseIntPipe) articleId: number,
    @Body() dto: CreateArticleFaqDto,
  ) {
    return this.contentService.createArticleFaq(articleId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @ApiOperation({ summary: 'دریافت لیست سوالات متداول یک مقاله' })
  @ApiBearerAuth('JWT-auth')
  @CheckAbilities((ability) => ability.can('read', 'Article'))
  findAll(@Param('articleId', ParseIntPipe) articleId: number) {
    return this.contentService.findArticleFaqs(articleId);
  }

  @Patch('reorder')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @ApiOperation({ summary: 'مرتب‌سازی سوالات متداول مقاله' })
  @ApiBearerAuth('JWT-auth')
  @CheckAbilities((ability) => ability.can('update', 'Article'))
  reorder(
    @Param('articleId', ParseIntPipe) articleId: number,
    @Body() dto: ReorderArticleFaqDto,
  ) {
    return this.contentService.reorderArticleFaqs(articleId, dto);
  }

  @Patch(':faqId')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @ApiOperation({ summary: 'ویرایش سوال متداول مقاله' })
  @ApiBearerAuth('JWT-auth')
  @CheckAbilities((ability) => ability.can('update', 'Article'))
  update(
    @Param('articleId', ParseIntPipe) articleId: number,
    @Param('faqId', ParseIntPipe) faqId: number,
    @Body() dto: UpdateArticleFaqDto,
  ) {
    return this.contentService.updateArticleFaq(articleId, faqId, dto);
  }

  @Delete(':faqId')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'حذف سوال متداول مقاله' })
  @ApiBearerAuth('JWT-auth')
  @CheckAbilities((ability) => ability.can('update', 'Article'))
  async remove(
    @Param('articleId', ParseIntPipe) articleId: number,
    @Param('faqId', ParseIntPipe) faqId: number,
  ) {
    await this.contentService.removeArticleFaq(articleId, faqId);
  }
}
