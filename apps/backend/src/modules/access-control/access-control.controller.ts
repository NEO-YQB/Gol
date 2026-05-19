import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { CheckAbilities } from '../../common/decorators/check-abilities.decorator';
import { AbilitiesGuard } from '../../common/guards/abilities.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AccessControlService } from './access-control.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { ListPermissionsQueryDto } from './dto/list-permissions-query.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@ApiTags('Admin - Access Control')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, AbilitiesGuard)
@Controller('admin/access-control')
export class AccessControlController {
  constructor(private readonly accessControlService: AccessControlService) {}

  @Get('users')
  @CheckAbilities((ability) => ability.can('manage', 'all'))
  @ApiOperation({ summary: 'لیست کاربران پنل با نقش و permission موثر' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['ALL', 'ACTIVE', 'INACTIVE'] })
  @ApiQuery({ name: 'role', required: false, type: String })
  @ApiQuery({ name: 'hasRoles', required: false, type: Boolean })
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.accessControlService.listUsers(query);
  }

  @Get('users/:id')
  @CheckAbilities((ability) => ability.can('manage', 'all'))
  @ApiOperation({ summary: 'جزئیات یک کاربر به همراه roleها و permissionهای موثر' })
  findUser(@Param('id', ParseIntPipe) id: number) {
    return this.accessControlService.findUser(id);
  }

  @Patch('users/:id/status')
  @CheckAbilities((ability) => ability.can('manage', 'all'))
  @ApiOperation({ summary: 'فعال/غیرفعال کردن حساب کاربری' })
  @ApiBody({ type: UpdateUserStatusDto })
  updateUserStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserStatusDto,
    @GetUser() user: { id: number },
  ) {
    return this.accessControlService.updateUserStatus(id, dto, user);
  }

  @Patch('users/:id/roles')
  @CheckAbilities((ability) => ability.can('manage', 'all'))
  @ApiOperation({ summary: 'جایگزینی کامل roleهای یک کاربر' })
  @ApiBody({ type: UpdateUserRolesDto })
  replaceUserRoles(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserRolesDto,
    @GetUser() user: { id: number },
  ) {
    return this.accessControlService.replaceUserRoles(id, dto, user);
  }

  @Get('roles')
  @CheckAbilities((ability) => ability.can('manage', 'all'))
  @ApiOperation({ summary: 'لیست roleها با permissionها و تعداد کاربران' })
  listRoles() {
    return this.accessControlService.listRoles();
  }

  @Get('roles/:id')
  @CheckAbilities((ability) => ability.can('manage', 'all'))
  @ApiOperation({ summary: 'جزئیات یک role به همراه permissionها و نمونه کاربران' })
  findRole(@Param('id', ParseIntPipe) id: number) {
    return this.accessControlService.findRole(id);
  }

  @Post('roles')
  @CheckAbilities((ability) => ability.can('manage', 'all'))
  @ApiOperation({ summary: 'ایجاد role جدید برای پنل مدیریتی' })
  @ApiBody({ type: CreateRoleDto })
  createRole(@Body() dto: CreateRoleDto) {
    return this.accessControlService.createRole(dto);
  }

  @Patch('roles/:id')
  @CheckAbilities((ability) => ability.can('manage', 'all'))
  @ApiOperation({ summary: 'ویرایش اطلاعات پایه role' })
  @ApiBody({ type: UpdateRoleDto })
  updateRole(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoleDto) {
    return this.accessControlService.updateRole(id, dto);
  }

  @Patch('roles/:id/permissions')
  @CheckAbilities((ability) => ability.can('manage', 'all'))
  @ApiOperation({ summary: 'جایگزینی کامل permissionهای یک role' })
  @ApiBody({ type: UpdateRolePermissionsDto })
  replaceRolePermissions(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRolePermissionsDto) {
    return this.accessControlService.replaceRolePermissions(id, dto);
  }

  @Get('permissions')
  @CheckAbilities((ability) => ability.can('manage', 'all'))
  @ApiOperation({ summary: 'لیست permissionها برای ساخت ماتریس دسترسی' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'subject', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  listPermissions(@Query() query: ListPermissionsQueryDto) {
    return this.accessControlService.listPermissions(query);
  }
}
