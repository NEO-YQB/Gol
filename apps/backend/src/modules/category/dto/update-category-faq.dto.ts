import { PartialType } from '@nestjs/mapped-types';
import { CreateCategoryFaqDto } from './create-category-faq.dto';

export class UpdateCategoryFaqDto extends PartialType(CreateCategoryFaqDto) {}
