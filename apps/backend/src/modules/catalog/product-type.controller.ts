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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AbilitiesGuard } from '../../common/guards/abilities.guard';
import { CheckAbilities } from '../../common/decorators/check-abilities.decorator';
import { CreateProductTypeDto } from './dto/create-product-type.dto';
import { UpdateProductTypeDto } from './dto/update-product-type.dto';
import { ProductTypeService } from './product-type.service';

@ApiTags('Catalog - Product Types')
@Controller('product-types')
export class ProductTypeController {
  constructor(private readonly productTypeService: ProductTypeService) {}

  @Post()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @CheckAbilities((ability) => ability.can('manage', 'ProductType'))
  @ApiOperation({ summary: 'ایجاد نوع محصول' })
  @ApiResponse({ status: 201, description: 'نوع محصول با موفقیت ایجاد شد.' })
  create(@Body() createProductTypeDto: CreateProductTypeDto) {
    return this.productTypeService.create(createProductTypeDto);
  }

  @Get()
  @ApiOperation({ summary: 'دریافت لیست نوع های محصول' })
  findAll() {
    return this.productTypeService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'دریافت جزئیات یک نوع محصول' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productTypeService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @CheckAbilities((ability) => ability.can('manage', 'ProductType'))
  @ApiOperation({ summary: 'ویرایش نوع محصول' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductTypeDto: UpdateProductTypeDto,
  ) {
    return this.productTypeService.update(id, updateProductTypeDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @CheckAbilities((ability) => ability.can('manage', 'ProductType'))
  @ApiOperation({ summary: 'حذف نوع محصول' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.productTypeService.remove(id);
  }
}
