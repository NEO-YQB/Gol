import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ArticlesController } from './articles.controller';
import { ArticleCategoriesController } from './article-categories.controller';
import { ArticleTagsController } from './article-tags.controller';
import { AuthorsController } from './authors.controller';
import { ContentPublicController } from './content-public.controller';
import { ContentService } from './content.service';

@Module({
  imports: [AuthModule],
  controllers: [
    AuthorsController,
    ArticleCategoriesController,
    ArticleTagsController,
    ArticlesController,
    ContentPublicController,
  ],
  providers: [ContentService],
})
export class ContentModule {}
