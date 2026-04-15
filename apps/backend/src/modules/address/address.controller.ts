import { Controller, Post, Get, Delete, Body, UseGuards, Param, ParseIntPipe } from '@nestjs/common';
import { AddressService } from './address.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { CreateAddressDto } from './dto/create-address.dto';
import { AbilitiesGuard } from '../../common/guards/abilities.guard';
import { CheckAbilities } from '../../common/decorators/check-abilities.decorator';
import { subject } from '@casl/ability';

@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Post()
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @CheckAbilities((ability, context) => {
    const { user } = context.switchToHttp().getRequest();
    return ability.can('manage', subject('UserAddress', { userId: user.id }));
  })
  create(@GetUser('id') userId: number, @Body() dto: CreateAddressDto) {
    return this.addressService.create(userId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @CheckAbilities((ability, context) => {
    const { user } = context.switchToHttp().getRequest();
    return ability.can('read', subject('UserAddress', { userId: user.id }));
  })
  findAll(@GetUser('id') userId: number) {
    return this.addressService.findAll(userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @CheckAbilities((ability, context) => {
    const { user } = context.switchToHttp().getRequest();
    return ability.can('delete', subject('UserAddress', { userId: user.id }));
  })
  remove(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.addressService.remove(user, id);
  }
}
