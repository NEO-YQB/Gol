import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ListPermissionsQueryDto } from './dto/list-permissions-query.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Injectable()
export class AccessControlService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(query: ListUsersQueryDto) {
    const { page = 1, limit = 20, search, status = 'ALL', role, hasRoles } = query;
    const skip = (page - 1) * limit;

    const andWhere: Prisma.UserWhereInput[] = [];

    if (search?.trim()) {
      andWhere.push({
        OR: [
          { phoneNumber: { contains: search.trim(), mode: 'insensitive' } },
          { fullName: { contains: search.trim(), mode: 'insensitive' } },
          { email: { contains: search.trim(), mode: 'insensitive' } },
        ],
      });
    }

    if (status === 'ACTIVE') {
      andWhere.push({ isActive: true });
    } else if (status === 'INACTIVE') {
      andWhere.push({ isActive: false });
    }

    if (role?.trim()) {
      andWhere.push({
        roles: {
          some: {
            role: {
              name: role.trim(),
            },
          },
        },
      });
    }

    if (hasRoles === true) {
      andWhere.push({ roles: { some: {} } });
    } else if (hasRoles === false) {
      andWhere.push({ roles: { none: {} } });
    }

    const where: Prisma.UserWhereInput = andWhere.length ? { AND: andWhere } : {};

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              role: {
                name: 'asc',
              },
            },
          },
          contentAuthor: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          store: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: {
              orders: true,
              supportTickets: true,
              reviews: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: data.map((user) => this.mapUser(user)),
      meta: {
        total,
        page,
        lastPage: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
          orderBy: {
            role: {
              name: 'asc',
            },
          },
        },
        contentAuthor: true,
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            orders: true,
            supportTickets: true,
            reviews: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }

    return this.mapUser(user);
  }


  async createUser(dto: CreateUserDto) {
    await this.ensurePhoneNumberAvailable(dto.phoneNumber);
    if (dto.email) {
      await this.ensureEmailAvailable(dto.email);
    }

    const uniqueRoleIds = Array.from(new Set(dto.roleIds ?? []));
    if (uniqueRoleIds.length > 0) {
      await this.ensureRoleIdsExist(uniqueRoleIds);
    }

    const createdUser = await this.prisma.user.create({
      data: {
        phoneNumber: dto.phoneNumber,
        fullName: dto.fullName,
        email: dto.email,
        isActive: dto.isActive ?? true,
        roles: uniqueRoleIds.length
          ? {
              create: uniqueRoleIds.map((roleId) => ({ roleId })),
            }
          : undefined,
      },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        contentAuthor: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            orders: true,
            supportTickets: true,
            reviews: true,
          },
        },
      },
    });

    return this.mapUser(createdUser);
  }

  async updateUserStatus(userId: number, dto: UpdateUserStatusDto, actor: { id: number }) {
    await this.ensureUserExists(userId);
    if (actor.id === userId && dto.isActive === false) {
      throw new BadRequestException('کاربر نمی تواند حساب خودش را از داخل پنل غیرفعال کند');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: dto.isActive },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return this.mapUser(user);
  }

  async replaceUserRoles(userId: number, dto: UpdateUserRolesDto, actor: { id: number }) {
    await this.ensureUserExists(userId);
    if (actor.id === userId && dto.roleIds.length === 0) {
      throw new BadRequestException('کاربر نمی تواند همه نقش های خودش را حذف کند');
    }

    const roles = await this.prisma.role.findMany({
      where: {
        id: { in: Array.from(new Set(dto.roleIds)) },
      },
      select: { id: true },
    });

    if (roles.length !== Array.from(new Set(dto.roleIds)).length) {
      throw new NotFoundException('یک یا چند نقش انتخاب شده یافت نشد');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.usersOnRoles.deleteMany({ where: { userId } });
      await tx.usersOnRoles.createMany({
        data: Array.from(new Set(dto.roleIds)).map((roleId) => ({ userId, roleId })),
        skipDuplicates: true,
      });
    });

    return this.findUser(userId);
  }

  async listRoles() {
    const roles = await this.prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
          orderBy: {
            permission: {
              subject: 'asc',
            },
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: [{ name: 'asc' }],
    });

    return roles.map((role) => this.mapRole(role));
  }

  async findRole(roleId: number) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
          orderBy: {
            permission: {
              subject: 'asc',
            },
          },
        },
        users: {
          select: {
            user: {
              select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                isActive: true,
              },
            },
          },
          take: 12,
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('نقش یافت نشد');
    }

    return this.mapRole(role);
  }

  async createRole(dto: CreateRoleDto) {
    await this.ensureRoleNameAvailable(dto.name);
    const role = await this.prisma.role.create({
      data: dto,
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    return this.mapRole(role);
  }

  async updateRole(roleId: number, dto: UpdateRoleDto) {
    await this.ensureRoleExists(roleId);
    if (dto.name) {
      await this.ensureRoleNameAvailable(dto.name, roleId);
    }

    const role = await this.prisma.role.update({
      where: { id: roleId },
      data: dto,
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    return this.mapRole(role);
  }

  async replaceRolePermissions(roleId: number, dto: UpdateRolePermissionsDto) {
    await this.ensureRoleExists(roleId);

    const uniquePermissionIds = Array.from(new Set(dto.permissionIds));
    const permissions = await this.prisma.permission.findMany({
      where: {
        id: { in: uniquePermissionIds },
      },
      select: { id: true },
    });

    if (permissions.length !== uniquePermissionIds.length) {
      throw new NotFoundException('یک یا چند permission انتخاب شده یافت نشد');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.rolesOnPermissions.deleteMany({ where: { roleId } });
      if (uniquePermissionIds.length > 0) {
        await tx.rolesOnPermissions.createMany({
          data: uniquePermissionIds.map((permissionId) => ({ roleId, permissionId })),
          skipDuplicates: true,
        });
      }
    });

    return this.findRole(roleId);
  }

  async listPermissions(query: ListPermissionsQueryDto) {
    const { page = 1, limit = 50, action, subject, search } = query;
    const skip = (page - 1) * limit;

    const andWhere: Prisma.PermissionWhereInput[] = [];

    if (action?.trim()) {
      andWhere.push({ action: { contains: action.trim(), mode: 'insensitive' } });
    }

    if (subject?.trim()) {
      andWhere.push({ subject: { contains: subject.trim(), mode: 'insensitive' } });
    }

    if (search?.trim()) {
      andWhere.push({
        OR: [
          { action: { contains: search.trim(), mode: 'insensitive' } },
          { subject: { contains: search.trim(), mode: 'insensitive' } },
        ],
      });
    }

    const where: Prisma.PermissionWhereInput = andWhere.length ? { AND: andWhere } : {};

    const [data, total] = await Promise.all([
      this.prisma.permission.findMany({
        where,
        skip,
        take: limit,
        include: {
          roles: {
            include: {
              role: true,
            },
            orderBy: {
              role: {
                name: 'asc',
              },
            },
          },
        },
        orderBy: [{ subject: 'asc' }, { action: 'asc' }],
      }),
      this.prisma.permission.count({ where }),
    ]);

    return {
      data: data.map((permission) => ({
        id: permission.id,
        action: permission.action,
        subject: permission.subject,
        inverted: permission.inverted,
        conditions: permission.conditions,
        roles: permission.roles.map((link) => ({
          id: link.role.id,
          name: link.role.name,
          label: link.role.label,
        })),
      })),
      meta: {
        total,
        page,
        lastPage: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }


  private async ensureRoleIdsExist(roleIds: number[]) {
    const roles = await this.prisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true },
    });

    if (roles.length !== roleIds.length) {
      throw new NotFoundException('یک یا چند نقش انتخاب شده یافت نشد');
    }
  }

  private async ensurePhoneNumberAvailable(phoneNumber: string) {
    const existing = await this.prisma.user.findUnique({
      where: { phoneNumber },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('این شماره موبایل قبلا ثبت شده است');
    }
  }

  private async ensureEmailAvailable(email: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('این ایمیل قبلا ثبت شده است');
    }
  }

  private async ensureUserExists(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }
  }

  private async ensureRoleExists(roleId: number) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true },
    });

    if (!role) {
      throw new NotFoundException('نقش یافت نشد');
    }
  }

  private async ensureRoleNameAvailable(name: string, excludeRoleId?: number) {
    const existing = await this.prisma.role.findUnique({
      where: { name },
      select: { id: true },
    });

    if (existing && existing.id !== excludeRoleId) {
      throw new ConflictException('نام این role قبلا ثبت شده است');
    }
  }

  private mapRole(role: {
    id: number;
    name: string;
    label?: string | null;
    description?: string | null;
    permissions?: Array<{
      permission: {
        id: number;
        action: string;
        subject: string;
        inverted: boolean;
        conditions: Prisma.JsonValue | null;
      };
    }>;
    _count?: { users?: number };
    users?: Array<{
      user: {
        id: number;
        fullName: string | null;
        phoneNumber: string;
        isActive: boolean;
      };
    }>;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    return {
      id: role.id,
      name: role.name,
      label: role.label,
      description: role.description,
      permissions: (role.permissions ?? []).map((link) => ({
        id: link.permission.id,
        action: link.permission.action,
        subject: link.permission.subject,
        inverted: link.permission.inverted,
        conditions: link.permission.conditions,
      })),
      permissionCount: role.permissions?.length ?? 0,
      userCount: role._count?.users ?? 0,
      sampleUsers: (role.users ?? []).map((entry) => ({
        id: entry.user.id,
        fullName: entry.user.fullName,
        phoneNumber: entry.user.phoneNumber,
        isActive: entry.user.isActive,
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  private mapUser(user: {
    id: number;
    phoneNumber: string;
    email?: string | null;
    fullName?: string | null;
    isActive: boolean;
    roles?: Array<{
      role: {
        id: number;
        name: string;
        label?: string | null;
        description?: string | null;
        permissions?: Array<{
          permission: {
            id: number;
            action: string;
            subject: string;
            inverted: boolean;
            conditions: Prisma.JsonValue | null;
          };
        }>;
      };
    }>;
    contentAuthor?: { id: number; name: string; slug: string } | null;
    store?: { id: number; name: string; slug: string } | null;
    _count?: { orders?: number; supportTickets?: number; reviews?: number };
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    const roles = (user.roles ?? []).map((link) => ({
      id: link.role.id,
      name: link.role.name,
      label: link.role.label,
      description: link.role.description,
      permissions: (link.role.permissions ?? []).map((permissionLink) => ({
        id: permissionLink.permission.id,
        action: permissionLink.permission.action,
        subject: permissionLink.permission.subject,
        inverted: permissionLink.permission.inverted,
        conditions: permissionLink.permission.conditions,
      })),
    }));

    const effectivePermissionsMap = new Map<string, {
      id: number;
      action: string;
      subject: string;
      inverted: boolean;
      conditions: Prisma.JsonValue | null;
    }>();

    for (const role of roles) {
      for (const permission of role.permissions) {
        effectivePermissionsMap.set(`${permission.action}:${permission.subject}:${permission.id}`, permission);
      }
    }

    return {
      id: user.id,
      phoneNumber: user.phoneNumber,
      email: user.email,
      fullName: user.fullName,
      isActive: user.isActive,
      roles: roles.map(({ permissions, ...roleMeta }) => roleMeta),
      effectivePermissions: Array.from(effectivePermissionsMap.values()),
      contentAuthor: user.contentAuthor
        ? {
            id: user.contentAuthor.id,
            name: user.contentAuthor.name,
            slug: user.contentAuthor.slug,
          }
        : null,
      store: user.store
        ? {
            id: user.store.id,
            name: user.store.name,
            slug: user.store.slug,
          }
        : null,
      counts: {
        orders: user._count?.orders ?? 0,
        supportTickets: user._count?.supportTickets ?? 0,
        reviews: user._count?.reviews ?? 0,
      },
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
