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
import { CreateAuthorDto } from './dto/create-author.dto';
import { UpdateAuthorDto } from './dto/update-author.dto';

@ApiTags('Content - Authors')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, AbilitiesGuard)
@Controller('content/authors')
export class AuthorsController {
  constructor(private readonly contentService: ContentService) {}

  @Post()
  @CheckAbilities((ability) => ability.can('create', 'Author'))
  @ApiOperation({ summary: 'ایجاد نویسنده محتوا', description: 'ایجاد پروفایل نویسنده همراه با bio و seoBio برای آمادگی بیشتر صفحه نویسنده.' })
  @ApiBody({ type: CreateAuthorDto })
  create(@Body() dto: CreateAuthorDto) {
    return this.contentService.createAuthor(dto);
  }

  @Get()
  @CheckAbilities((ability) => ability.can('read', 'Author'))
  @ApiOperation({ summary: 'دریافت لیست نویسنده‌ها' })
  findAll() {
    return this.contentService.findAllAuthors();
  }

  @Get(':id')
  @CheckAbilities((ability) => ability.can('read', 'Author'))
  @ApiOperation({ summary: 'دریافت جزئیات نویسنده' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.contentService.findAuthor(id);
  }

  @Patch(':id')
  @CheckAbilities((ability) => ability.can('update', 'Author'))
  @ApiOperation({ summary: 'ویرایش نویسنده', description: 'ویرایش نویسنده و metadataهای محتوایی/SEO مربوط به bio.' })
  @ApiBody({ type: UpdateAuthorDto })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAuthorDto) {
    return this.contentService.updateAuthor(id, dto);
  }

  @Delete(':id')
  @CheckAbilities((ability) => ability.can('delete', 'Author'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'حذف نویسنده' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.contentService.removeAuthor(id);
  }
}
