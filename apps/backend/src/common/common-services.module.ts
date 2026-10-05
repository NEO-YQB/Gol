import { Global, Module } from '@nestjs/common';
import { DomainEventsService } from './services/domain-events.service';
import { VendorProvisioningService } from './services/vendor-provisioning.service';

@Global()
@Module({
  providers: [DomainEventsService, VendorProvisioningService],
  exports: [DomainEventsService, VendorProvisioningService],
})
export class CommonServicesModule {}
