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
import { StoreService } from './store.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'; // اصلاح مسیر مطابق ساختار پروژه شما
import { GetUser } from '../../common/decorators/get-user.decorator';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Stores')
@Controller('stores')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'ایجاد فروشگاه' })
  create(@Body() createStoreDto: CreateStoreDto, @GetUser('id') userId: number) {
    return this.storeService.create(createStoreDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'دریافت لیست فروشگاه ها' })
  findAll() {
    return this.storeService.findAll();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'دریافت جزئیات فروشگاه با اسلاگ' })
  findOne(@Param('slug') slug: string) {
    return this.storeService.findBySlug(slug);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'ویرایش فروشگاه' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStoreDto: UpdateStoreDto,
    @GetUser() user: { id: number; roles: string[] },
  ) {
    return this.storeService.update(id, updateStoreDto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'حذف فروشگاه' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: { id: number; roles: string[] },
  ) {
    await this.storeService.remove(id, user);
  }
}
