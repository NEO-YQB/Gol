import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminListNotificationsQueryDto } from './dto/admin-list-notifications-query.dto';
import { MarkNotificationStatusDto } from './dto/mark-notification-status.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('admin')
  @ApiOperation({ summary: 'لیست notification/outbox برای ادمین' })
  adminList(
    @GetUser() user: { id: number; roles: string[] },
    @Query() query: AdminListNotificationsQueryDto,
  ) {
    return this.notificationsService.adminList(user, query);
  }

  @Patch('admin/:id/status')
  @ApiOperation({ summary: 'تغییر status notification توسط ادمین' })
  adminMarkStatus(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MarkNotificationStatusDto,
  ) {
    return this.notificationsService.adminMarkStatus(user, id, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'notification history کاربر جاری' })
  myNotifications(@GetUser() user: { id: number; roles: string[] }) {
    return this.notificationsService.myNotifications(user);
  }

  @Get('vendor/me')
  @ApiOperation({ summary: 'notification history فروشنده جاری' })
  vendorNotifications(@GetUser() user: { id: number; roles: string[] }) {
    return this.notificationsService.vendorNotifications(user);
  }
}
