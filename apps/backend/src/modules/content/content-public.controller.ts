import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ContentService } from './content.service';
import {
  ContentSitemapEntityType,
  GetContentSitemapQueryDto,
} from './dto/get-content-sitemap-query.dto';
import { GetPublicArticleListingQueryDto } from './dto/get-public-article-listing-query.dto';
import {
  GetStructuredDataQueryDto,
  StructuredDataPageType,
} from './dto/get-structured-data-query.dto';

@ApiTags('Content - Public')
@Controller('content/public')
export class ContentPublicController {
  constructor(private readonly contentService: ContentService) {}

  @Get('articles')
  @ApiOperation({ summary: 'دریافت لیست عمومی مقاله‌های منتشرشده', description: 'لیست عمومی فقط شامل مقاله‌های published است و از search/sort/pagination پشتیبانی می‌کند.' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sort', required: false, enum: ['NEWEST', 'OLDEST'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  listPublishedArticles(@Query() query: GetPublicArticleListingQueryDto) {
    return this.contentService.listPublishedArticles(query);
  }

  @Get('articles/:slug')
  @ApiOperation({ summary: 'دریافت detail عمومی مقاله بر اساس slug', description: 'خروجی page-ready برای صفحه public مقاله شامل content، TOC، metadata، author و taxonomyها.' })
  @ApiParam({ name: 'slug', description: 'slug مقاله منتشرشده' })
  getPublishedArticleDetail(@Param('slug') slug: string) {
    return this.contentService.getPublishedArticleDetailBySlug(slug);
  }

  @Get('categories')
  @ApiOperation({ summary: 'دریافت لیست عمومی دسته‌بندی‌های مقاله', description: 'لیست عمومی taxonomyهای نوع category با count مقاله‌های published.' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  listPublishedCategories(@Query() query: GetPublicArticleListingQueryDto) {
    return this.contentService.listPublishedCategories(query);
  }

  @Get('categories/:slug')
  @ApiOperation({ summary: 'دریافت صفحه listing عمومی یک دسته‌بندی مقاله', description: 'صفحه listing عمومی یک category. اگر slug قبلی استفاده شود، `redirectFromSlug` در response برمی‌گردد.' })
  @ApiParam({ name: 'slug', description: 'slug فعلی یا slug قدیمی category' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sort', required: false, enum: ['NEWEST', 'OLDEST'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getCategoryListing(
    @Param('slug') slug: string,
    @Query() query: GetPublicArticleListingQueryDto,
  ) {
    return this.contentService.getCategoryListingBySlug(slug, query);
  }

  @Get('tags')
  @ApiOperation({ summary: 'دریافت لیست عمومی تگ‌های مقاله', description: 'لیست عمومی taxonomyهای نوع tag با count مقاله‌های published.' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  listPublishedTags(@Query() query: GetPublicArticleListingQueryDto) {
    return this.contentService.listPublishedTags(query);
  }

  @Get('tags/:slug')
  @ApiOperation({ summary: 'دریافت صفحه listing عمومی یک تگ مقاله', description: 'صفحه listing عمومی یک tag. اگر slug قبلی استفاده شود، `redirectFromSlug` در response برمی‌گردد.' })
  @ApiParam({ name: 'slug', description: 'slug فعلی یا slug قدیمی tag' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sort', required: false, enum: ['NEWEST', 'OLDEST'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTagListing(
    @Param('slug') slug: string,
    @Query() query: GetPublicArticleListingQueryDto,
  ) {
    return this.contentService.getTagListingBySlug(slug, query);
  }

  @Get('authors/:slug')
  @ApiOperation({ summary: 'دریافت detail عمومی نویسنده بر اساس slug', description: 'خروجی page-ready برای صفحه نویسنده شامل bio، seoBio، metadata پایه و مقاله‌های published نویسنده.' })
  @ApiParam({ name: 'slug', description: 'slug نویسنده' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getAuthorDetail(
    @Param('slug') slug: string,
    @Query() query: GetPublicArticleListingQueryDto,
  ) {
    return this.contentService.getPublicAuthorDetailBySlug(slug, query);
  }

  @Get('structured-data/:slug')
  @ApiOperation({ summary: 'دریافت structured data آماده رندر برای صفحه محتوایی', description: 'خروجی structured data برای article/category/tag به‌صورت backend-ready و قابل استفاده در frontend.' })
  @ApiParam({ name: 'slug', description: 'slug صفحه محتوایی' })
  @ApiQuery({ name: 'type', required: true, enum: ['ARTICLE', 'CATEGORY', 'TAG'] })
  getStructuredData(
    @Param('slug') slug: string,
    @Query() query: GetStructuredDataQueryDto,
  ) {
    return this.contentService.getStructuredDataBySlug(slug, query.type);
  }

  @Get('breadcrumbs/:slug')
  @ApiOperation({ summary: 'دریافت breadcrumb آماده رندر برای category/tag/article', description: 'خروجی breadcrumb برای ساخت `BreadcrumbList` و navigation crawlable.' })
  @ApiParam({ name: 'slug', description: 'slug صفحه محتوایی' })
  @ApiQuery({ name: 'type', required: true, enum: ['ARTICLE', 'CATEGORY', 'TAG'] })
  getBreadcrumbs(
    @Param('slug') slug: string,
    @Query() query: GetStructuredDataQueryDto,
  ) {
    return this.contentService.getBreadcrumbsBySlug(slug, query.type);
  }

  @Get('sitemap')
  @ApiOperation({ summary: 'دریافت sitemap hooks برای content domain', description: 'خروجی داده‌محور برای تولید sitemap article/category/tag همراه با lastmod و canonical.' })
  @ApiQuery({ name: 'type', required: false, enum: ['ARTICLE', 'CATEGORY', 'TAG', 'ALL'] })
  getSitemapHooks(@Query() query: GetContentSitemapQueryDto) {
    return this.contentService.getContentSitemapHooks(
      query.type ?? ContentSitemapEntityType.ALL,
    );
  }
}
