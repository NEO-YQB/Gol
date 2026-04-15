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
    { action: 'manage', subject: 'all', label: 'دسترسی کامل به سیستم' },
    { action: 'create', subject: 'Product', label: 'ایجاد محصول' },
    { action: 'update', subject: 'Product', label: 'ویرایش محصول' },
    { action: 'delete', subject: 'Product', label: 'حذف محصول' },
    { action: 'read', subject: 'Order', label: 'مشاهده سفارشات' },
  ];

  console.log('Creating permissions...');
  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { action_subject: { action: p.action, subject: p.subject } },
      update: {},
      create: {
        action: p.action,
        subject: p.subject,
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
  // ادمین دسترسی manage:all می‌گیرد
  const allPermission = await prisma.permission.findFirst({
    where: { action: 'manage', subject: 'all' },
  });

  if (allPermission) {
    await prisma.rolesOnPermissions.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: allPermission.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: allPermission.id },
    });
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