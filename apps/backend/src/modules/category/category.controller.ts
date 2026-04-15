import { Controller, Get, Post, Body, UseGuards  } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

@ApiTags('Catalog - Categories') // اضافه شد
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard) 
  @ApiOperation({ summary: 'ایجاد دسته‌بندی جدید' }) // اضافه شد
  @ApiBearerAuth('JWT-auth') // اضافه شد
  @ApiResponse({ status: 201, description: 'دسته‌بندی با موفقیت ایجاد شد.' }) // اضافه شد
  @Roles('ADMIN') 
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'دریافت لیست درختی دسته‌بندی‌ها' }) // اضافه شد
  findAll() {
    return this.categoryService.findAllWithChildren();
  }
}