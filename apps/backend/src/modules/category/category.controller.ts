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
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AbilitiesGuard } from '../../common/guards/abilities.guard';
import { CheckAbilities } from '../../common/decorators/check-abilities.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

@ApiTags('Catalog - Categories') // اضافه شد
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @ApiOperation({ summary: 'ایجاد دسته‌بندی جدید' }) // اضافه شد
  @ApiBearerAuth('JWT-auth') // اضافه شد
  @ApiResponse({ status: 201, description: 'دسته‌بندی با موفقیت ایجاد شد.' }) // اضافه شد
  @CheckAbilities((ability) => ability.can('manage', 'Category'))
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'دریافت لیست درختی دسته‌بندی‌ها' }) // اضافه شد
  findAll() {
    return this.categoryService.findAllWithChildren();
  }

  @Get(':id')
  @ApiOperation({ summary: 'دریافت جزئیات یک دسته بندی' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @ApiOperation({ summary: 'ویرایش دسته بندی' })
  @ApiBearerAuth('JWT-auth')
  @CheckAbilities((ability) => ability.can('manage', 'Category'))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'حذف دسته بندی' })
  @ApiBearerAuth('JWT-auth')
  @CheckAbilities((ability) => ability.can('manage', 'Category'))
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.categoryService.remove(id);
  }
}
