import { Controller, Post, Get, Delete, Body, UseGuards, Param, ParseIntPipe } from '@nestjs/common';
import { AddressService } from './address.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { CreateAddressDto } from './dto/create-address.dto';

@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Post()
  create(
    @GetUser() user: { id: number; roles: string[] },
    @Body() dto: CreateAddressDto,
  ) {
    return this.addressService.create(user, dto);
  }

  @Get()
  findAll(@GetUser() user: { id: number; roles: string[] }) {
    return this.addressService.findAll(user);
  }

  @Delete(':id')
  remove(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.addressService.remove(user, id);
  }
}
