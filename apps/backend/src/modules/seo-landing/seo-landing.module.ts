import { Module } from '@nestjs/common';
import { SeoLandingController } from './seo-landing.controller';
import { SeoLandingService } from './seo-landing.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SeoLandingController],
  providers: [SeoLandingService],
  exports: [SeoLandingService],
})
export class SeoLandingModule {}
