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
import { CheckAbilities } from '../../common/decorators/check-abilities.decorator';
import { AbilitiesGuard } from '../../common/guards/abilities.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ContentService } from './content.service';
import { CreateArticleTagDto } from './dto/create-article-tag.dto';
import { GetArticleTagsQueryDto } from './dto/get-article-tags-query.dto';
import { UpdateArticleTagDto } from './dto/update-article-tag.dto';

@ApiTags('Content - Article Tags')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, AbilitiesGuard)
@Controller('content/article-tags')
export class ArticleTagsController {
  constructor(private readonly contentService: ContentService) {}

  @Post()
  @CheckAbilities((ability) => ability.can('create', 'ArticleTag'))
  @ApiOperation({ summary: 'ایجاد تگ مقاله', description: 'ایجاد taxonomy از نوع tag برای استفاده در listing و دسته‌بندی محتوای مقاله‌ها.' })
  @ApiBody({ type: CreateArticleTagDto })
  create(@Body() dto: CreateArticleTagDto) {
    return this.contentService.createArticleTag(dto);
  }

  @Get()
  @CheckAbilities((ability) => ability.can('read', 'ArticleTag'))
  @ApiOperation({ summary: 'دریافت لیست تگ‌های مقاله', description: 'دریافت لیست paginated تگ‌ها با امکان جستجو بر اساس title یا slug.' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(@Query() query: GetArticleTagsQueryDto) {
    return this.contentService.findAllArticleTags(query);
  }

  @Get(':id')
  @CheckAbilities((ability) => ability.can('read', 'ArticleTag'))
  @ApiOperation({ summary: 'دریافت جزئیات تگ مقاله' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.contentService.findArticleTag(id);
  }

  @Patch(':id')
  @CheckAbilities((ability) => ability.can('update', 'ArticleTag'))
  @ApiOperation({ summary: 'ویرایش تگ مقاله', description: 'ویرایش tag. در صورت تغییر slug، رکورد redirect برای slug قبلی ثبت می‌شود.' })
  @ApiBody({ type: UpdateArticleTagDto })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateArticleTagDto) {
    return this.contentService.updateArticleTag(id, dto);
  }

  @Delete(':id')
  @CheckAbilities((ability) => ability.can('delete', 'ArticleTag'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'حذف تگ مقاله' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.contentService.removeArticleTag(id);
  }
}
