import { PartialType } from '@nestjs/mapped-types';
import { CreateProductTypeFaqDto } from './create-product-type-faq.dto';

export class UpdateProductTypeFaqDto extends PartialType(CreateProductTypeFaqDto) {}
