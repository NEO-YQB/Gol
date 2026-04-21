import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { ProductTypeController } from './product-type.controller';
import { ProductTypeService } from './product-type.service';


@Module({
  controllers: [ProductController, ProductTypeController],
  providers: [ProductService, ProductTypeService],
})
export class CatalogModule {}
