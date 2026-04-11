import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';

@Module({
  controllers: [CategoryController],
  providers: [CategoryService],
  exports: [CategoryService], // اگر جای دیگر لازم است
})
export class CategoryModule {} // <--- نام این کلاس باید دقیقاً همین باشد
