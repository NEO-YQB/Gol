import { Global, Module } from '@nestjs/common';
import { DomainEventsService } from './services/domain-events.service';

@Global()
@Module({
  providers: [DomainEventsService],
  exports: [DomainEventsService],
})
export class CommonServicesModule {}
