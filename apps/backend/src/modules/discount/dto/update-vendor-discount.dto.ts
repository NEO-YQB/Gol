import { PartialType } from '@nestjs/swagger';
import { CreateVendorDiscountDto } from './create-vendor-discount.dto';

export class UpdateVendorDiscountDto extends PartialType(CreateVendorDiscountDto) {}
