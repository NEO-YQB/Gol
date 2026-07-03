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
import { SeoLandingService } from './seo-landing.service';
import { CreateSeoLandingDto } from './dto/create-seo-landing.dto';
import { UpdateSeoLandingDto } from './dto/update-seo-landing.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AbilitiesGuard } from '../../common/guards/abilities.guard';
import { CheckAbilities } from '../../common/decorators/check-abilities.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';

@ApiTags('SEO - Smart Landings')
@Controller('seo-landings')
export class SeoLandingController {
  constructor(private readonly seoLandingService: SeoLandingService) {}

  @Post()
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @ApiOperation({ summary: 'ایجاد لندینگ سئو جدید' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ status: 201, description: 'لندینگ با موفقیت ایجاد شد.' })
  @CheckAbilities((ability) => ability.can('manage', 'all'))
  create(@Body() createDto: CreateSeoLandingDto) {
    return this.seoLandingService.create(createDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @ApiOperation({ summary: 'دریافت لیست لندینگ‌های سئو' })
  @ApiBearerAuth('JWT-auth')
  @CheckAbilities((ability) => ability.can('manage', 'all'))
  findAll() {
    return this.seoLandingService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @ApiOperation({ summary: 'دریافت جزئیات یک لندینگ سئو' })
  @ApiBearerAuth('JWT-auth')
  @CheckAbilities((ability) => ability.can('manage', 'all'))
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.seoLandingService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @ApiOperation({ summary: 'ویرایش لندینگ سئو' })
  @ApiBearerAuth('JWT-auth')
  @CheckAbilities((ability) => ability.can('manage', 'all'))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateSeoLandingDto,
  ) {
    return this.seoLandingService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'حذف لندینگ سئو' })
  @ApiBearerAuth('JWT-auth')
  @CheckAbilities((ability) => ability.can('manage', 'all'))
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.seoLandingService.remove(id);
  }

  @Get('match')
  @ApiOperation({ summary: 'مچ کردن لندینگ بر اساس دسته‌بندی و فیلترها (عمومی)' })
  @ApiQuery({ name: 'categoryId', type: Number, description: 'شناسه دسته‌بندی' })
  @ApiQuery({ name: 'filterIds', type: String, description: 'لیست شناسه‌های فیلتر ( جداشده)', example: '5,12' })
  @ApiResponse({ status: 200, description: 'لندینگ مچ شده یا null' })
  matchLanding(
    @Query('categoryId', ParseIntPipe) categoryId: number,
    @Query('filterIds') filterIdsStr: string,
  ) {
    const filterIds = filterIdsStr
      ? filterIdsStr.split(',').map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n) && n > 0)
      : [];
    return this.seoLandingService.matchLanding(categoryId, filterIds);
  }
}
