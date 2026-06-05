import { Controller, Post, Get, Delete, Patch, Body, UseGuards, Param, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { AddressService } from './address.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { CreateAddressDto } from './dto/create-address.dto';

@ApiTags('Addresses')
@ApiBearerAuth('JWT-auth')
@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Post()
  @ApiOperation({ summary: 'ایجاد آدرس جدید برای کاربر جاری' })
  @ApiOkResponse({
    description: 'آدرس با موفقیت ایجاد شد',
    schema: {
      example: {
        id: 7,
        title: 'خانه',
        address: 'تهران، خیابان ولیعصر، پلاک 10',
        city: 'تهران',
        lat: 35.7219,
        lng: 51.3347,
        isDefault: true,
        userId: 12,
        createdAt: '2026-05-05T10:40:00.000Z',
        updatedAt: '2026-05-05T10:40:00.000Z',
      },
    },
  })
  create(
    @GetUser() user: { id: number; roles: string[] },
    @Body() dto: CreateAddressDto,
  ) {
    return this.addressService.create(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'دریافت لیست آدرس‌های کاربر جاری' })
  @ApiOkResponse({
    description: 'لیست آدرس‌های کاربر جاری',
    schema: {
      example: [
        {
          id: 7,
          title: 'خانه',
          address: 'تهران، خیابان ولیعصر، پلاک 10',
          city: 'تهران',
          lat: 35.7219,
          lng: 51.3347,
          isDefault: true,
          userId: 12,
          createdAt: '2026-05-05T10:40:00.000Z',
          updatedAt: '2026-05-05T10:40:00.000Z',
        },
      ],
    },
  })
  findAll(@GetUser() user: { id: number; roles: string[] }) {
    return this.addressService.findAll(user);
  }

  @Patch(':id/default')
  @ApiOperation({ summary: 'تنظیم آدرس پیش‌فرض برای کاربر جاری' })
  @ApiParam({ name: 'id', type: Number, description: 'شناسه آدرس' })
  @ApiOkResponse({
    description: 'آدرس با موفقیت به‌عنوان پیش‌فرض تنظیم شد',
    schema: {
      example: {
        id: 7,
        title: 'خانه',
        address: 'تهران، خیابان ولیعصر، پلاک 10',
        city: 'تهران',
        lat: 35.7219,
        lng: 51.3347,
        isDefault: true,
        userId: 12,
      },
    },
  })
  setDefault(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.addressService.setDefault(user, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف آدرس کاربر جاری' })
  @ApiParam({ name: 'id', type: Number, description: 'شناسه آدرس' })
  @ApiOkResponse({
    description: 'آدرس با موفقیت حذف شد',
    schema: {
      example: {
        id: 7,
        title: 'خانه',
        address: 'تهران، خیابان ولیعصر، پلاک 10',
        city: 'تهران',
        lat: 35.7219,
        lng: 51.3347,
        isDefault: true,
        userId: 12,
      },
    },
  })
  remove(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.addressService.remove(user, id);
  }
}
