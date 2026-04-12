import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seeding...');

  // ۱. ایجاد یک کاربر ادمین
  const adminUser = await prisma.user.upsert({
    where: { phoneNumber: '09123456789' },
    update: {},
    create: {
      phoneNumber: '09123456789',
      fullName: 'مدیر سیستم',
      role: Role.ADMIN,
      email: 'admin@masterdebug.ir', // فیلد ایمیل که احتمالا در مدل جدید اجباری یا یکتاست
    },
  });
  console.log('✅ Admin user created');

  // ۲. ایجاد یک فروشگاه
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

  // ۳. ایجاد دسته‌بندی‌ها
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

  // ۴. ایجاد یک محصول نمونه (برای تست فیلدهای جدید)
  const product = await prisma.product.upsert({
    where: { slug: 'iphone-15-pro-test' },
    update: {},
    create: {
      name: 'iPhone 15 Pro Test',
      slug: 'iphone-15-pro-test',
      description: 'این یک محصول تست شده توسط سیستم Seed است',
      price: 999.99,
      stock: 50,
      categoryId: mobileCategory.id,
      storeId: store.id,
      mainImage: 'https://via.placeholder.com/600',
      images: ['https://via.placeholder.com/300', 'https://via.placeholder.com/400'],
      attributes: {
        color: 'Titanium',
        storage: '256GB'
      },
    },
  });
  console.log('✅ Sample product created');

  console.log('🚀 Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
