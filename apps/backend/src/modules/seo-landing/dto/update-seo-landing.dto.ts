import { PartialType } from '@nestjs/mapped-types';
import { CreateSeoLandingDto } from './create-seo-landing.dto';

export class UpdateSeoLandingDto extends PartialType(CreateSeoLandingDto) {}
