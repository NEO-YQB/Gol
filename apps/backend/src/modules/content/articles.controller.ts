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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { CheckAbilities } from '../../common/decorators/check-abilities.decorator';
import { AbilitiesGuard } from '../../common/guards/abilities.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ContentService } from './content.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { ContentAuditType, GetContentAuditQueryDto } from './dto/get-content-audit-query.dto';
import { GetArticlesQueryDto } from './dto/get-articles-query.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@ApiTags('Content - Articles')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, AbilitiesGuard)
@Controller('content/articles')
export class ArticlesController {
  constructor(private readonly contentService: ContentService) {}

  @Post()
  @CheckAbilities(
    (ability) => ability.can('create', 'Article'),
    (ability, context) => {
      const body = context.switchToHttp().getRequest().body as CreateArticleDto;
      if (body?.tagIds?.length) {
        return ability.can('assignTags', 'Article');
      }
      return true;
    },
  )
  @ApiOperation({ summary: 'ایجاد مقاله', description: 'ایجاد مقاله جدید. اتصال tag به مقاله فقط برای نقش‌های مجاز محتوا/SEO یا admin ممکن است.' })
  @ApiBody({ type: CreateArticleDto })
  create(
    @Body() dto: CreateArticleDto,
    @GetUser() user: { id: number; roles: string[] },
  ) {
    return this.contentService.createArticle(dto, user);
  }

  @Get()
  @CheckAbilities((ability) => ability.can('read', 'Article'))
  @ApiOperation({ summary: 'دریافت لیست مقاله‌ها برای ادمین', description: 'لیست مقاله‌ها با امکان فیلتر بر اساس وضعیت انتشار، نویسنده، دسته‌بندی و tag.' })
  @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'PUBLISHED'] })
  @ApiQuery({ name: 'authorId', required: false, type: Number })
  @ApiQuery({ name: 'categoryId', required: false, type: Number })
  @ApiQuery({ name: 'tagId', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(@Query() query: GetArticlesQueryDto) {
    return this.contentService.findAllArticles(query);
  }

  @Get('audits/list')
  @CheckAbilities((ability) => ability.can('read', 'Article'))
  @ApiOperation({ summary: 'دریافت auditهای محتوایی پایه', description: 'گزارش‌های سبک برای تیم SEO مانند مقاله‌های بدون tag، بدون focus keyword و categoryهای thin.' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: [
      ContentAuditType.ARTICLES_WITHOUT_TAG,
      ContentAuditType.ARTICLES_WITHOUT_FOCUS_KEYWORD,
      ContentAuditType.ARTICLES_WITHOUT_CATEGORY,
      ContentAuditType.THIN_CATEGORIES,
    ],
  })
  getAudits(@Query() query: GetContentAuditQueryDto) {
    return this.contentService.getContentAudits(query.type);
  }

  @Get(':id')
  @CheckAbilities((ability) => ability.can('read', 'Article'))
  @ApiOperation({ summary: 'دریافت جزئیات مقاله' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.contentService.findArticle(id);
  }

  @Patch(':id')
  @CheckAbilities(
    (ability) => ability.can('update', 'Article'),
    (ability, context) => {
      const body = context.switchToHttp().getRequest().body as UpdateArticleDto;
      if (body?.tagIds) {
        return ability.can('assignTags', 'Article');
      }
      return true;
    },
  )
  @ApiOperation({ summary: 'ویرایش مقاله و تغییر draft/publish', description: 'ویرایش مقاله. تغییر tagهای مقاله نیازمند permission مستقل `assignTags:Article` است.' })
  @ApiBody({ type: UpdateArticleDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateArticleDto,
    @GetUser() user: { id: number; roles: string[] },
  ) {
    return this.contentService.updateArticle(id, dto, user);
  }

  @Delete(':id')
  @CheckAbilities((ability) => ability.can('delete', 'Article'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'حذف مقاله' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.contentService.removeArticle(id);
  }
}
