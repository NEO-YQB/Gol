import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { PageBuilderService } from './page-builder.service';

@ApiTags('Storefront - Admin Pages')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/pages')
export class AdminPagesController {
  constructor(private readonly pageBuilderService: PageBuilderService) {}

  @Post()
  @ApiOperation({ summary: 'ایجاد صفحه جدید برای storefront' })
  @ApiBody({ type: CreatePageDto })
  create(
    @Body() dto: CreatePageDto,
    @GetUser() user: { id: number; roles: string[] },
  ) {
    return this.pageBuilderService.createPage(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'دریافت لیست صفحات storefront برای مدیریت ادمین' })
  findAll() {
    return this.pageBuilderService.findAllAdminPages();
  }

  @Get(':id')
  @ApiOperation({ summary: 'دریافت جزئیات یک صفحه storefront' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.pageBuilderService.findAdminPageById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'به‌روزرسانی کامل صفحه storefront' })
  @ApiBody({ type: UpdatePageDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePageDto,
    @GetUser() user: { id: number; roles: string[] },
  ) {
    return this.pageBuilderService.updatePage(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'حذف صفحه storefront' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.pageBuilderService.deletePage(id);
  }
}
