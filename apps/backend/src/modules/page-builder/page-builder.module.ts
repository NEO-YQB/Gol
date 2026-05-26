import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminPagesController } from './admin-pages.controller';
import { PublicPagesController } from './public-pages.controller';
import { PageBuilderCacheService } from './page-builder-cache.service';
import { PageBuilderService } from './page-builder.service';
import { pageBlockValidationProviders } from './dto/page-block.dto';

@Module({
  imports: [AuthModule],
  controllers: [AdminPagesController, PublicPagesController],
  providers: [
    PageBuilderService,
    PageBuilderCacheService,
    ...pageBlockValidationProviders,
  ],
})
export class PageBuilderModule {}
