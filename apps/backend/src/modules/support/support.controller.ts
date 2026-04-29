import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminListSupportTicketsQueryDto } from './dto/admin-list-support-tickets-query.dto';
import { CreateSupportTicketNoteDto } from './dto/create-support-ticket-note.dto';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { SupportFinanceDecisionDto } from './dto/support-finance-decision.dto';
import { UpdateSupportTicketStatusDto } from './dto/update-support-ticket-status.dto';
import { SupportService } from './support.service';

@ApiTags('Support')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('orders/:orderId/tickets')
  @ApiOperation({ summary: 'ثبت شکایت/تیکت برای سفارش تحویل‌شده توسط مشتری' })
  createOrderTicket(
    @GetUser() user: { id: number; roles: string[] },
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: CreateSupportTicketDto,
  ) {
    return this.supportService.customerCreateOrderTicket(user, orderId, dto);
  }

  @Get('tickets/me')
  @ApiOperation({ summary: 'لیست تیکت‌های مشتری جاری' })
  myTickets(@GetUser() user: { id: number; roles: string[] }) {
    return this.supportService.customerListMyTickets(user);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'جزئیات تیکت برای مشتری، فروشنده مالک سفارش یا ادمین' })
  getTicket(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.supportService.getTicket(user, id);
  }

  @Post('tickets/:id/notes')
  @ApiOperation({ summary: 'ثبت پیام یا note روی تیکت' })
  addNote(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSupportTicketNoteDto,
  ) {
    return this.supportService.addTicketNote(user, id, dto);
  }

  @Get('admin/tickets')
  @ApiOperation({ summary: 'لیست تیکت‌ها برای ادمین/پشتیبانی' })
  adminListTickets(
    @GetUser() user: { id: number; roles: string[] },
    @Query() query: AdminListSupportTicketsQueryDto,
  ) {
    return this.supportService.adminListTickets(user, query);
  }

  @Patch('admin/tickets/:id/status')
  @ApiOperation({ summary: 'تغییر وضعیت تیکت توسط ادمین/پشتیبانی' })
  adminUpdateStatus(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSupportTicketStatusDto,
  ) {
    return this.supportService.adminUpdateStatus(user, id, dto);
  }

  @Post('admin/tickets/:id/finance-decision')
  @ApiOperation({ summary: 'ثبت تصمیم مالی برای تیکت escalate شده' })
  adminFinanceDecision(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SupportFinanceDecisionDto,
  ) {
    return this.supportService.adminApplyFinanceDecision(user, id, dto);
  }
}
