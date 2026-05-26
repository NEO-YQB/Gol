import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GetPageBySlugQueryDto } from './dto/get-page-by-slug-query.dto';
import { PageBuilderService } from './page-builder.service';

@ApiTags('Storefront - Public Pages')
@Controller('pages')
export class PublicPagesController {
  constructor(private readonly pageBuilderService: PageBuilderService) {}

  @Get('by-slug')
  @ApiOperation({
    summary: 'دریافت صفحه storefront بر اساس slug',
    description:
      'تنها صفحات فعال برگردانده می‌شوند. بلوک‌های محصولات به‌صورت config-only بازگشت داده می‌شوند تا فرانت‌استور قیمت و موجودی را جداگانه به‌صورت زنده واکشی کند.',
  })
  @ApiQuery({ name: 'slug', required: true, example: '/' })
  findBySlug(@Query() query: GetPageBySlugQueryDto) {
    return this.pageBuilderService.findPublicPageBySlug(query);
  }
}
