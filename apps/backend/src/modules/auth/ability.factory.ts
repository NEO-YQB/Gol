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
  | 'ProductElement'
  | 'ProductType'
  | 'Category'
  | 'Store'
  | 'File'
  | 'Order'
  | 'Payment'
  | 'PaymentGatewayConfig'
  | 'CommissionRule'
  | 'StoreWallet'
  | 'WalletTransaction'
  | 'VendorDiscount'
  | 'PlatformPromotion'
  | 'Coupon'
  | 'Cart'
  | 'UserAddress'
  | 'Review'
  | 'Article'
  | 'ArticleCategory'
  | 'Author'
  | 'ArticleTag';

type RuleDefinition = {
  action: string | string[];
  subject: AppSubjects | AppSubjects[];
  conditions?: Record<string, unknown>;
};

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

    const rolesWithoutPermissions = new Set<string>();

    if (dbUser) {
      for (const userRole of dbUser.roles) {
        if (userRole.role.permissions.length === 0) {
          rolesWithoutPermissions.add(userRole.role.name);
        }

        for (const rolePermission of userRole.role.permissions) {
          const permission = rolePermission.permission;
          const conditions = this.resolveConditions(permission.conditions, user);
          const applyRule = permission.inverted ? cannot : can;
          if (
            conditions &&
            typeof conditions === 'object' &&
            !Array.isArray(conditions)
          ) {
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

    // Cart is a base capability for any authenticated user.
    can(['create', 'read', 'update', 'delete'] as any, 'Cart' as any, {
      userId: user.id,
    });

    const effectiveRoles = dbUser
      ? dbUser.roles.map((userRole) => userRole.role.name)
      : user.roles;

    for (const role of effectiveRoles) {
      if (!dbUser || rolesWithoutPermissions.has(role)) {
        this.applyFallbackRules(role, user, can as (...args: any[]) => unknown);
      }
    }

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

  private applyFallbackRules(
    role: string,
    user: { id: number; roles: string[]; phoneNumber?: string },
    can: (...args: any[]) => unknown,
  ) {
    const fallbackRules: Record<string, RuleDefinition[]> = {
      ADMIN: [{ action: 'manage', subject: 'all' }],
      VENDOR: [
        { action: 'read', subject: ['Product', 'Category', 'Store'] },
        { action: 'create', subject: 'Store' },
        { action: ['create', 'update', 'delete'], subject: 'Product', conditions: { ownerId: user.id } },
        { action: 'manage', subject: 'Store', conditions: { ownerId: user.id } },
        {
          action: ['create', 'read', 'update', 'delete'],
          subject: 'VendorDiscount',
          conditions: { ownerId: user.id },
        },
        { action: 'create', subject: 'File' },
      ],
      CUSTOMER: [
        { action: 'read', subject: ['Product', 'Category', 'Store'] },
        { action: 'read', subject: 'VendorDiscount' },
        { action: ['create', 'read', 'update'], subject: 'Order', conditions: { userId: user.id } },
        { action: ['create', 'read'], subject: 'Payment', conditions: { userId: user.id } },
        { action: ['create', 'read', 'update', 'delete'], subject: 'Cart', conditions: { userId: user.id } },
        { action: 'manage', subject: 'UserAddress', conditions: { userId: user.id } },
        { action: ['create', 'read'], subject: 'Review', conditions: { userId: user.id } },
      ],
      CONTENT_WRITER: [
        { action: 'read', subject: ['Article', 'ArticleCategory', 'Author', 'ArticleTag'] },
        { action: ['create', 'update'], subject: 'Article' },
      ],
      CONTENT_EDITOR: [
        { action: 'read', subject: ['Article', 'ArticleCategory', 'Author', 'ArticleTag'] },
        { action: ['create', 'update', 'delete', 'assignTags'], subject: 'Article' },
        { action: ['create', 'update'], subject: ['ArticleCategory', 'Author', 'ArticleTag'] },
      ],
      SEO_MANAGER: [
        { action: 'read', subject: ['Article', 'ArticleCategory', 'Author', 'ArticleTag'] },
        { action: ['create', 'update', 'delete', 'assignTags'], subject: 'Article' },
        { action: ['create', 'update', 'delete'], subject: ['ArticleCategory', 'Author', 'ArticleTag'] },
      ],
      FINANCE_OPERATOR: [
        { action: 'read', subject: ['Payment', 'StoreWallet', 'WalletTransaction', 'CommissionRule', 'AdminPermission'] },
        { action: 'update', subject: 'StoreWallet' },
        { action: 'create', subject: 'WalletTransaction' },
      ],
      SUPPORT_AGENT: [
        { action: ['read', 'update'], subject: 'SupportTicket' },
        { action: ['create', 'read'], subject: 'SupportTicketNote' },
      ],
      ACCESS_MANAGER: [
        { action: 'read', subject: ['AdminUser', 'AdminRole', 'AdminPermission'] },
        { action: 'updateStatus', subject: 'AdminUser' },
        { action: 'assignRoles', subject: 'AdminUser' },
        { action: ['create', 'update'], subject: 'AdminRole' },
        { action: 'assignPermissions', subject: 'AdminRole' },
      ],
    };

    for (const rule of fallbackRules[role] ?? []) {
      if (rule.conditions) {
        can(rule.action as any, rule.subject as any, rule.conditions);
      } else {
        can(rule.action as any, rule.subject as any);
      }
    }
  }
}
