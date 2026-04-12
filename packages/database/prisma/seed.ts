import { PrismaClient, Role, ElementType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding...');

  // ۱. ایجاد کاربر ادمین یا فروشنده (به عنوان صاحب فروشگاه)
  const owner = await prisma.user.upsert({
    where: { phoneNumber: '09123456789' },
    update: {},
    create: {
      phoneNumber: '09123456789',
      fullName: 'مدیر تستی',
      role: Role.VENDOR,
    },
  });

  // ۲. ایجاد یک فروشگاه (اجباری برای محصول)
  const store = await prisma.store.upsert({
    where: { slug: 'test-store' },
    update: {},
    create: {
      name: 'گل‌فروشی نمونه',
      slug: 'test-store',
      ownerId: owner.id,
      isVerified: true,
      address: 'تهران، خیابان ولیعصر',
      lat: 35.7219,
      lng: 51.3347,
    },
  });

  // ۳. ایجاد دسته‌بندی
  const category = await prisma.category.upsert({
    where: { slug: 'birthday-flowers' },
    update: {},
    create: {
      name: 'گل تولد',
      slug: 'birthday-flowers',
      description: 'بهترین گل‌ها برای هدیه تولد',
    },
  });

  // ۴. ایجاد نوع محصول
  const productType = await prisma.productType.upsert({
    where: { slug: 'flower-box' },
    update: {},
    create: {
      name: 'باکس گل',
      slug: 'flower-box',
      description: 'انواع باکس‌های گل مجلل',
    },
  });

  // ۵. ایجاد اجزای پایه (گل و متعلقات)
  const rose = await prisma.productElement.upsert({
    where: { name: 'رز هلندی قرمز' },
    update: {},
    create: {
      name: 'رز هلندی قرمز',
      type: ElementType.FLOWER,
      unit: 'شاخه',
    },
  });

  // ۶. ایجاد یک محصول نمونه با رعایت تمام روابط
  const product = await prisma.product.upsert({
    where: { slug: 'luxury-rose-box' },
    update: {},
    create: {
      name: 'باکس گل رز لاکچری',
      slug: 'luxury-rose-box',
      description: 'یک باکس گل رز هلندی فوق‌العاده زیبا',
      price: 1500000,
      mainImage: 'https://example.com/rose-box.jpg',
      images: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
      storeId: store.id,
      categoryId: category.id,
      productTypeId: productType.id,
      metaTitle: 'خرید باکس گل رز لاکچری | ارسال فوری',
      metaDescription: 'خرید آنلاین باکس گل رز قرمز با بهترین قیمت و کیفیت عالی',
      composition: {
        create: [
          {
            elementId: rose.id,
            quantity: 20,
            elementType: ElementType.FLOWER,
          },
        ],
      },
    },
  });

  console.log({ owner, store, category, product });
  console.log('✅ Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
