import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seeding...');

  // ۱. پاکسازی داده‌های قبلی (اختیاری - با احتیاط استفاده شود)
  // ترتیب پاکسازی مهم است به دلیل روابط Foreign Key
  await prisma.usersOnRoles.deleteMany();
  await prisma.rolesOnPermissions.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  // await prisma.user.deleteMany(); // اگر می‌خواهید کاربران هم پاک شوند این را از کامنت خارج کنید

  // ۲. تعریف دسترسی‌های پایه (Permissions)
  const permissions = [
    { action: 'manage', subject: 'all', conditions: null },
    { action: 'read', subject: 'Product', conditions: null },
    { action: 'read', subject: 'Category', conditions: null },
    { action: 'read', subject: 'Store', conditions: null },
    { action: 'manage', subject: 'ProductElement', conditions: null },
    { action: 'create', subject: 'Product', conditions: { ownerId: '{{user.id}}' } },
    { action: 'update', subject: 'Product', conditions: { ownerId: '{{user.id}}' } },
    { action: 'delete', subject: 'Product', conditions: { ownerId: '{{user.id}}' } },
    { action: 'manage', subject: 'Store', conditions: { ownerId: '{{user.id}}' } },
    { action: 'create', subject: 'File', conditions: null },
    { action: 'create', subject: 'Order', conditions: { userId: '{{user.id}}' } },
    { action: 'read', subject: 'Order', conditions: { userId: '{{user.id}}' } },
    { action: 'update', subject: 'Order', conditions: { userId: '{{user.id}}' } },
    { action: 'manage', subject: 'UserAddress', conditions: { userId: '{{user.id}}' } },
  ];

  console.log('Creating permissions...');
  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { action_subject: { action: p.action, subject: p.subject } },
      update: {
        conditions: p.conditions,
      },
      create: {
        action: p.action,
        subject: p.subject,
        conditions: p.conditions,
      },
    });
  }

  // ۳. ایجاد نقش‌ها (Roles)
  console.log('Creating roles...');
  
  // نقش مدیر کل
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      label: 'مدیر کل سیستم',
    },
  });

  // نقش فروشنده
  const vendorRole = await prisma.role.upsert({
    where: { name: 'VENDOR' },
    update: {},
    create: {
      name: 'VENDOR',
      label: 'فروشنده گل و گیاه',
    },
  });

  // نقش مشتری
  const customerRole = await prisma.role.upsert({
    where: { name: 'CUSTOMER' },
    update: {},
    create: {
      name: 'CUSTOMER',
      label: 'مشتری عادی',
    },
  });

  // ۴. متصل کردن دسترسی‌ها به نقش‌ها
  const permissionRecords = await prisma.permission.findMany();
  const permissionMap = new Map(
    permissionRecords.map((permission) => [
      `${permission.action}:${permission.subject}`,
      permission,
    ]),
  );

  const rolePermissionMap = {
    ADMIN: ['manage:all'],
    VENDOR: [
      'read:Product',
      'read:Category',
      'read:Store',
      'create:Product',
      'update:Product',
      'delete:Product',
      'manage:Store',
      'create:File',
    ],
    CUSTOMER: [
      'read:Product',
      'read:Category',
      'read:Store',
      'create:Order',
      'read:Order',
      'update:Order',
      'manage:UserAddress',
    ],
  } as const;

  const rolesByName = {
    ADMIN: adminRole,
    VENDOR: vendorRole,
    CUSTOMER: customerRole,
  } as const;

  for (const [roleName, permissionKeys] of Object.entries(rolePermissionMap)) {
    const role = rolesByName[roleName as keyof typeof rolesByName];

    for (const key of permissionKeys) {
      const permission = permissionMap.get(key);
      if (!permission) {
        continue;
      }

      await prisma.rolesOnPermissions.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }

  // ۵. ایجاد یک کاربر ادمین نمونه برای تست
  console.log('Creating admin user...');
  const adminUser = await prisma.user.upsert({
    where: { phoneNumber: '09120000000' },
    update: {},
    create: {
      phoneNumber: '09120000000',
      fullName: 'مدیر اصلی',
      isActive: true,
    },
  });

  // اتصال کاربر به نقش ادمین
  await prisma.usersOnRoles.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });

  console.log('✅ Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
