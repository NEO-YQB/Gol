import { PartialType } from '@nestjs/swagger';
import { CreatePlatformPromotionDto } from './create-platform-promotion.dto';

export class UpdatePlatformPromotionDto extends PartialType(CreatePlatformPromotionDto) {}
