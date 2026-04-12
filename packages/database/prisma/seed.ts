import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seeding...');

  // ۱. ایجاد یک کاربر ادمین/فروشنده
  const adminUser = await prisma.user.upsert({
    where: { phoneNumber: '09123456789' },
    update: {},
    create: {
      phoneNumber: '09123456789',
      fullName: 'مدیر سیستم',
      role: Role.ADMIN,
    },
  });
  console.log('✅ Admin user created');

  // ۲. ایجاد یک فروشگاه برای این کاربر
  const store = await prisma.store.upsert({
    where: { slug: 'main-store' },
    update: {},
    create: {
      name: 'فروشگاه مرکزی نِست',
      slug: 'main-store',
      description: 'بهترین محصولات دیجیتال',
      ownerId: adminUser.id,
      isVerified: true,
    },
  });
  console.log('✅ Store created');

  // ۳. ایجاد دسته‌بندی‌های تستی (والد و فرزند)
  const electronics = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {},
    create: {
      name: 'کالای دیجیتال',
      slug: 'electronics',
      description: 'انواع لوازم الکترونیکی',
    },
  });

  const mobileCategory = await prisma.category.upsert({
    where: { slug: 'smartphones' },
    update: {},
    create: {
      name: 'گوشی هوشمند',
      slug: 'smartphones',
      parentId: electronics.id,
    },
  });
  console.log('✅ Categories created');

  console.log({
    message: '🚀 Seeding finished successfully',
    adminUserId: adminUser.id,
    storeId: store.id,
    categoryId: mobileCategory.id,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
