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

@ApiTags('Catalog - Categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @ApiOperation({ summary: 'ایجاد دسته‌بندی جدید' }) 
  @ApiBearerAuth('JWT-auth') 
  @ApiResponse({ status: 201, description: 'دسته‌بندی با موفقیت ایجاد شد.' }) 
  @CheckAbilities((ability) => ability.can('create', 'Category'))
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'دریافت لیست درختی دسته‌بندی‌ها' })
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
  @CheckAbilities((ability) => ability.can('update', 'Category'))
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
  @CheckAbilities((ability) => ability.can('delete', 'Category'))
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.categoryService.remove(id);
  }
}
