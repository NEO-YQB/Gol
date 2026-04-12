import { Controller, Post, Body, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { StoreService } from './store.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'; // اصلاح مسیر مطابق ساختار پروژه شما
import { GetUser } from '../../common/decorators/get-user.decorator';

@Controller('stores')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createStoreDto: CreateStoreDto, @GetUser('id') userId: number) {
    return this.storeService.create(createStoreDto, userId);
  }

  @Get()
  findAll() {
    return this.storeService.findAll();
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.storeService.findBySlug(slug);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateStoreDto: UpdateStoreDto,
    @GetUser() user: any,
  ) {
    return this.storeService.update(+id, updateStoreDto, user.id, user.role);
  }
}
