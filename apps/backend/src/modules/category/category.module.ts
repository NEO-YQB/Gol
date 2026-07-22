import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CategoryFaqController } from './category-faq.controller';
import { CategoryService } from './category.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CategoryController, CategoryFaqController],
  providers: [CategoryService],
  exports: [CategoryService],
})
export class CategoryModule {}
