import { Module } from '@nestjs/common';
import { ProductService } from '../product/product.service';
import { ProductController } from '../product/product.controller';


@Module({
  controllers: [ProductController],
  providers: [ProductService],
})
export class CatalogModule {}
