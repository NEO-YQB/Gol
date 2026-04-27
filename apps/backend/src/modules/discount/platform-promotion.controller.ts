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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { PlatformPromotionService } from './platform-promotion.service';
import { CreatePlatformPromotionDto } from './dto/create-platform-promotion.dto';
import { UpdatePlatformPromotionDto } from './dto/update-platform-promotion.dto';
import { GetPlatformPromotionsQueryDto } from './dto/get-platform-promotions-query.dto';

@ApiTags('Platform Promotions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('platform-promotions/admin')
export class PlatformPromotionController {
  constructor(
    private readonly platformPromotionService: PlatformPromotionService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'ایجاد platform promotion توسط ادمین' })
  create(
    @GetUser() user: { id: number; roles: string[] },
    @Body() dto: CreatePlatformPromotionDto,
  ) {
    return this.platformPromotionService.adminCreate(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'لیست platform promotionها برای ادمین' })
  findAll(
    @GetUser() user: { id: number; roles: string[] },
    @Query() query: GetPlatformPromotionsQueryDto,
  ) {
    return this.platformPromotionService.adminList(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'جزئیات platform promotion برای ادمین' })
  findOne(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.platformPromotionService.adminFindOne(user, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش platform promotion توسط ادمین' })
  update(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlatformPromotionDto,
  ) {
    return this.platformPromotionService.adminUpdate(user, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف platform promotion توسط ادمین' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.platformPromotionService.adminRemove(user, id);
  }
}
