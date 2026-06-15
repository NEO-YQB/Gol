import { Module } from '@nestjs/common';
import { FirebaseAdminService } from './firebase-admin.service';
import { NotificationDispatchService } from './notification-dispatch.service';
import { NotificationTemplatesService } from './notification-templates.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationTemplatesService,
    NotificationDispatchService,
    FirebaseAdminService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
