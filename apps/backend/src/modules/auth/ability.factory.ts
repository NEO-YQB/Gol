import { AbilityBuilder, ExtractSubjectType } from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppAbility } from '../../common/guards/abilities.guard';
import { createPrismaAbility } from '@casl/prisma';
import { PrismaService } from '../../prisma/prisma.service';

type AppSubjects =
  | 'all'
  | 'User'
  | 'Product'
  | 'Category'
  | 'Store'
  | 'Order'
  | 'UserAddress';

@Injectable()
export class AbilityFactory {
  constructor(private prisma: PrismaService) {}

  async createForUser(user: {
    id: number;
    roles: string[];
    phoneNumber?: string;
  }): Promise<AppAbility> {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(
      createPrismaAbility,
    );

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
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

    if (dbUser) {
      for (const userRole of dbUser.roles) {
        for (const rolePermission of userRole.role.permissions) {
          const permission = rolePermission.permission;
          const conditions = this.resolveConditions(permission.conditions, user);
          const applyRule = permission.inverted ? cannot : can;
          if (conditions && typeof conditions === 'object' && !Array.isArray(conditions)) {
            applyRule(
              permission.action as any,
              permission.subject as any,
              conditions as Record<string, unknown>,
            );
          } else {
            applyRule(permission.action as any, permission.subject as any);
          }
        }
      }
    }

    const effectiveRoles = dbUser
      ? dbUser.roles.map((userRole) => userRole.role.name)
      : user.roles;

    if (effectiveRoles.includes('ADMIN')) {
      can('manage', 'all');
    }

    if (effectiveRoles.includes('VENDOR')) {
      can('read', 'Product');
      can('create', 'Product', { ownerId: user.id });
      can('update', 'Product', { ownerId: user.id });
      can('delete', 'Product', { ownerId: user.id });

      can('manage', 'Store', { ownerId: user.id });
    }

    if (effectiveRoles.includes('CUSTOMER')) {
      can('read', 'Product');
      can('read', 'Category');
      can('read', 'Store');

      can('create', 'Order', { userId: user.id });
      can('read', 'Order', { userId: user.id });
      can('update', 'Order', { userId: user.id });

      can('manage', 'UserAddress', { userId: user.id });
    }

    can('read', ['Product', 'Category', 'Store']);

    return build({
      detectSubjectType: (item) =>
        item.__caslSubjectType__ as ExtractSubjectType<AppSubjects>,
    });
  }

  private resolveConditions(
    conditions: Prisma.JsonValue | null,
    user: { id: number; roles: string[]; phoneNumber?: string },
  ): Prisma.JsonValue | null {
    if (!conditions) {
      return null;
    }

    if (typeof conditions === 'string') {
      return conditions
        .replaceAll('{{user.id}}', String(user.id))
        .replaceAll('{{user.phoneNumber}}', user.phoneNumber ?? '');
    }

    if (Array.isArray(conditions)) {
      return conditions.map((item) => this.resolveConditions(item, user)) as Prisma.JsonArray;
    }

    if (typeof conditions === 'object') {
      const resolved: Record<string, Prisma.JsonValue> = {};
      for (const [key, value] of Object.entries(conditions)) {
        const nextValue = this.resolveConditions(value as Prisma.JsonValue, user);
        if (typeof nextValue === 'string' && nextValue === String(user.id) && key.toLowerCase().endsWith('id')) {
          resolved[key] = Number(nextValue);
        } else {
          resolved[key] = nextValue;
        }
      }
      return resolved as Prisma.JsonObject;
    }

    return conditions;
  }
}
