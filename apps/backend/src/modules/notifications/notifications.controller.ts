import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminDispatchNotificationDto } from './dto/admin-dispatch-notification.dto';
import { AdminListNotificationsQueryDto } from './dto/admin-list-notifications-query.dto';
import { MarkNotificationStatusDto } from './dto/mark-notification-status.dto';
import { RegisterPushDeviceDto } from './dto/register-push-device.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('admin')
  @ApiOperation({ summary: 'لیست notification/outbox برای ادمین' })
  @ApiOkResponse({
    description: 'لیست notificationها همراه با deliveryها',
    schema: {
      example: {
        data: [
          {
            id: 13,
            topic: 'review.created',
            status: 'SENT',
            deliveries: [
              { id: 31, channel: 'IN_APP', status: 'SENT', attempts: 1 },
              { id: 32, channel: 'SMS', status: 'PENDING', attempts: 0 },
              { id: 33, channel: 'EMAIL', status: 'PENDING', attempts: 0 },
            ],
          },
        ],
        meta: { total: 1, page: 1, lastPage: 1 },
      },
    },
  })
  adminList(
    @GetUser() user: { id: number; roles: string[] },
    @Query() query: AdminListNotificationsQueryDto,
  ) {
    return this.notificationsService.adminList(user, query);
  }

  @Patch('admin/:id/status')
  @ApiOperation({ summary: 'تغییر status notification توسط ادمین' })
  @ApiParam({ name: 'id', type: Number, description: 'شناسه notification' })
  @ApiOkResponse({
    description: 'notification parent با status جدید',
    schema: {
      example: {
        id: 13,
        status: 'SENT',
        sentAt: '2026-05-05T10:50:00.000Z',
      },
    },
  })
  adminMarkStatus(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MarkNotificationStatusDto,
  ) {
    return this.notificationsService.adminMarkStatus(user, id, dto);
  }

  @Post('admin/:id/dispatch')
  @ApiOperation({ summary: 'dispatch simulation برای notification توسط ادمین' })
  @ApiParam({ name: 'id', type: Number, description: 'شناسه notification' })
  @ApiOkResponse({
    description: 'نتیجه dispatch روی notification یا deliveryها',
    schema: {
      example: {
        ok: true,
        reason: null,
        notification: {
          id: 13,
          topic: 'review.created',
          status: 'SENT',
        },
        delivery: {
          id: 31,
          channel: 'IN_APP',
          status: 'SENT',
          attempts: 1,
        },
      },
    },
  })
  adminDispatch(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminDispatchNotificationDto,
  ) {
    return this.notificationsService.adminDispatch(user, id, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'notification history کاربر جاری' })
  @ApiOkResponse({
    description: 'تاریخچه notificationهای کاربر جاری',
    schema: {
      example: [
        {
          id: 13,
          topic: 'review.created',
          status: 'SENT',
          deliveries: [
            { id: 31, channel: 'IN_APP', status: 'SENT', attempts: 1 },
            { id: 32, channel: 'SMS', status: 'PENDING', attempts: 0 },
          ],
        },
      ],
    },
  })
  myNotifications(@GetUser() user: { id: number; roles: string[] }) {
    return this.notificationsService.myNotifications(user);
  }

  @Get('vendor/me')
  @ApiOperation({ summary: 'notification history فروشنده جاری' })
  @ApiOkResponse({
    description: 'تاریخچه notificationهای فروشنده جاری',
    schema: {
      example: [
        {
          id: 19,
          topic: 'support.ticket.created',
          status: 'PENDING',
          deliveries: [
            { id: 41, channel: 'IN_APP', status: 'PENDING', attempts: 0 },
          ],
        },
      ],
    },
  })
  vendorNotifications(@GetUser() user: { id: number; roles: string[] }) {
    return this.notificationsService.vendorNotifications(user);
  }

  @Post('devices')
  @ApiOperation({ summary: 'ثبت یا به‌روزرسانی device token برای push' })
  @ApiOkResponse({
    description: 'device token ذخیره شد',
    schema: {
      example: {
        id: 1,
        token: 'fcm_device_token_here',
        platform: 'android',
        isActive: true,
      },
    },
  })
  registerDevice(
    @GetUser() user: { id: number; roles: string[] },
    @Body() dto: RegisterPushDeviceDto,
  ) {
    return this.notificationsService.registerPushDevice(user, dto);
  }
}
