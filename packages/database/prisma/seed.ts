import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

type PermissionSeed = {
  action: string;
  subject: string;
  inverted?: boolean;
  conditions?: Prisma.JsonValue | null;
};

const permissionCatalog: PermissionSeed[] = [
  { action: 'manage', subject: 'all', conditions: null },

  { action: 'read', subject: 'Product', conditions: null },
  { action: 'read', subject: 'Category', conditions: null },
  { action: 'read', subject: 'Store', conditions: null },

  { action: 'create', subject: 'Category', conditions: null },
  { action: 'update', subject: 'Category', conditions: null },
  { action: 'delete', subject: 'Category', conditions: null },

  { action: 'create', subject: 'ProductType', conditions: null },
  { action: 'update', subject: 'ProductType', conditions: null },
  { action: 'delete', subject: 'ProductType', conditions: null },

  { action: 'create', subject: 'ProductElement', conditions: null },
  { action: 'delete', subject: 'ProductElement', conditions: null },

  { action: 'create', subject: 'Product', conditions: { ownerId: '{{user.id}}' } },
  { action: 'update', subject: 'Product', conditions: { ownerId: '{{user.id}}' } },
  { action: 'delete', subject: 'Product', conditions: { ownerId: '{{user.id}}' } },

  { action: 'create', subject: 'Store', conditions: null },
  { action: 'update', subject: 'Store', conditions: { ownerId: '{{user.id}}' } },
  { action: 'delete', subject: 'Store', conditions: { ownerId: '{{user.id}}' } },

  { action: 'create', subject: 'File', conditions: null },

  { action: 'create', subject: 'Order', conditions: { userId: '{{user.id}}' } },
  { action: 'read', subject: 'Order', conditions: { userId: '{{user.id}}' } },
  { action: 'update', subject: 'Order', conditions: { userId: '{{user.id}}' } },

  { action: 'create', subject: 'Cart', conditions: { userId: '{{user.id}}' } },
  { action: 'read', subject: 'Cart', conditions: { userId: '{{user.id}}' } },
  { action: 'update', subject: 'Cart', conditions: { userId: '{{user.id}}' } },
  { action: 'delete', subject: 'Cart', conditions: { userId: '{{user.id}}' } },

  { action: 'create', subject: 'UserAddress', conditions: { userId: '{{user.id}}' } },
  { action: 'read', subject: 'UserAddress', conditions: { userId: '{{user.id}}' } },
  { action: 'delete', subject: 'UserAddress', conditions: { userId: '{{user.id}}' } },
];

const roleCatalog = [
  {
    name: 'ADMIN',
    label: 'مدیر کل سیستم',
    description: 'دسترسی کامل به همه بخش‌های سیستم',
  },
  {
    name: 'VENDOR',
    label: 'فروشنده گل و گیاه',
    description: 'مدیریت فروشگاه و محصولات متعلق به خود',
  },
  {
    name: 'CUSTOMER',
    label: 'مشتری عادی',
    description: 'ثبت سفارش و مدیریت آدرس‌های شخصی',
  },
] as const;

const defaultRolePermissions: Record<string, string[]> = {
  ADMIN: [
    'manage:all',
    'create:Cart',
    'read:Cart',
    'update:Cart',
    'delete:Cart',
  ],
  VENDOR: [
    'read:Product',
    'read:Category',
    'read:Store',
    'create:Cart',
    'read:Cart',
    'update:Cart',
    'delete:Cart',
    'create:Store',
    'update:Store',
    'delete:Store',
    'create:Product',
    'update:Product',
    'delete:Product',
    'create:File',
  ],
  CUSTOMER: [
    'read:Product',
    'read:Category',
    'read:Store',
    'create:Cart',
    'read:Cart',
    'update:Cart',
    'delete:Cart',
    'create:Order',
    'read:Order',
    'update:Order',
    'create:UserAddress',
    'read:UserAddress',
    'delete:UserAddress',
  ],
};

async function upsertPermissions() {
  console.log('Syncing permissions...');

  for (const permission of permissionCatalog) {
    await prisma.permission.upsert({
      where: {
        action_subject: {
          action: permission.action,
          subject: permission.subject,
        },
      },
      update: {
        inverted: permission.inverted ?? false,
        conditions: permission.conditions ?? null,
      },
      create: {
        action: permission.action,
        subject: permission.subject,
        inverted: permission.inverted ?? false,
        conditions: permission.conditions ?? null,
      },
    });
  }
}

async function upsertRoles() {
  console.log('Syncing roles...');

  const roles = new Map<string, { id: number }>();

  for (const role of roleCatalog) {
    const savedRole = await prisma.role.upsert({
      where: { name: role.name },
      update: {
        label: role.label,
        description: role.description,
      },
      create: role,
      select: { id: true },
    });

    roles.set(role.name, savedRole);
  }

  return roles;
}

async function syncDefaultRolePermissions(roleIds: Map<string, { id: number }>) {
  console.log('Linking default roles to permissions...');

  const allPermissions = await prisma.permission.findMany({
    select: { id: true, action: true, subject: true },
  });

  const permissionIdByKey = new Map(
    allPermissions.map((permission) => [
      `${permission.action}:${permission.subject}`,
      permission.id,
    ]),
  );

  for (const [roleName, permissionKeys] of Object.entries(defaultRolePermissions)) {
    const role = roleIds.get(roleName);

    if (!role) {
      continue;
    }

    for (const key of permissionKeys) {
      const permissionId = permissionIdByKey.get(key);

      if (!permissionId) {
        console.warn(`Missing permission key in seed mapping: ${key}`);
        continue;
      }

      await prisma.rolesOnPermissions.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId,
        },
      });
    }
  }
}

async function ensureAdminUser(roleIds: Map<string, { id: number }>) {
  console.log('Ensuring admin user exists...');

  const adminUser = await prisma.user.upsert({
    where: { phoneNumber: '09120000000' },
    update: {
      isActive: true,
      fullName: 'مدیر اصلی',
    },
    create: {
      phoneNumber: '09120000000',
      fullName: 'مدیر اصلی',
      isActive: true,
    },
  });

  const adminRole = roleIds.get('ADMIN');

  if (!adminRole) {
    throw new Error('ADMIN role not found after seeding.');
  }

  await prisma.usersOnRoles.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });
}

async function main() {
  console.log('🌱 Starting safe idempotent seed...');

  await upsertPermissions();
  const roleIds = await upsertRoles();
  await syncDefaultRolePermissions(roleIds);
  await ensureAdminUser(roleIds);

  console.log('✅ Seed completed. Existing business data was preserved.');
}

main()
  .catch((error) => {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
