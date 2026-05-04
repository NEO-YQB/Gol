import {
  CommissionRuleScope,
  CouponApplyOn,
  DeliveryType,
  DiscountLayer,
  DiscountValueType,
  DomainEventStatus,
  DomainEventType,
  ElementType,
  OrderActorType,
  OrderStatus,
  PaymentMethod,
  PaymentReviewStatus,
  PaymentStatus,
  Prisma,
  PrismaClient,
  SettlementStatus,
  SupportTicketActorType,
  SupportTicketFinanceOutcome,
  SupportTicketReason,
  SupportTicketStatus,
  VendorHealthStatus,
  WalletTransactionDirection,
  WalletTransactionType,
} from '@prisma/client';

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
  { action: 'create', subject: 'Payment', conditions: { userId: '{{user.id}}' } },
  { action: 'read', subject: 'Payment', conditions: { userId: '{{user.id}}' } },
  { action: 'read', subject: 'PaymentGatewayConfig', conditions: null },
  { action: 'create', subject: 'PaymentGatewayConfig', conditions: null },
  { action: 'update', subject: 'PaymentGatewayConfig', conditions: null },
  { action: 'create', subject: 'CommissionRule', conditions: null },
  { action: 'read', subject: 'CommissionRule', conditions: null },
  { action: 'update', subject: 'CommissionRule', conditions: null },
  { action: 'delete', subject: 'CommissionRule', conditions: null },
  { action: 'read', subject: 'StoreWallet', conditions: null },
  { action: 'update', subject: 'StoreWallet', conditions: null },
  { action: 'create', subject: 'WalletTransaction', conditions: null },
  { action: 'read', subject: 'WalletTransaction', conditions: null },
  { action: 'create', subject: 'SupportTicket', conditions: { customerId: '{{user.id}}' } },
  { action: 'read', subject: 'SupportTicket', conditions: { customerId: '{{user.id}}' } },
  { action: 'update', subject: 'SupportTicket', conditions: null },
  { action: 'create', subject: 'SupportTicketNote', conditions: null },
  { action: 'read', subject: 'SupportTicketNote', conditions: null },
  { action: 'create', subject: 'VendorDiscount', conditions: { ownerId: '{{user.id}}' } },
  { action: 'read', subject: 'VendorDiscount', conditions: null },
  { action: 'update', subject: 'VendorDiscount', conditions: { ownerId: '{{user.id}}' } },
  { action: 'delete', subject: 'VendorDiscount', conditions: { ownerId: '{{user.id}}' } },
  { action: 'create', subject: 'PlatformPromotion', conditions: null },
  { action: 'read', subject: 'PlatformPromotion', conditions: null },
  { action: 'update', subject: 'PlatformPromotion', conditions: null },
  { action: 'delete', subject: 'PlatformPromotion', conditions: null },
  { action: 'create', subject: 'Coupon', conditions: null },
  { action: 'read', subject: 'Coupon', conditions: null },
  { action: 'update', subject: 'Coupon', conditions: null },
  { action: 'delete', subject: 'Coupon', conditions: null },
  { action: 'create', subject: 'Cart', conditions: { userId: '{{user.id}}' } },
  { action: 'read', subject: 'Cart', conditions: { userId: '{{user.id}}' } },
  { action: 'update', subject: 'Cart', conditions: { userId: '{{user.id}}' } },
  { action: 'delete', subject: 'Cart', conditions: { userId: '{{user.id}}' } },
  { action: 'create', subject: 'UserAddress', conditions: { userId: '{{user.id}}' } },
  { action: 'read', subject: 'UserAddress', conditions: { userId: '{{user.id}}' } },
  { action: 'delete', subject: 'UserAddress', conditions: { userId: '{{user.id}}' } },
  { action: 'create', subject: 'Review', conditions: { userId: '{{user.id}}' } },
  { action: 'read', subject: 'Review', conditions: { userId: '{{user.id}}' } },
];

const roleCatalog = [
  { name: 'ADMIN', label: 'مدیر کل سیستم', description: 'دسترسی کامل به همه بخش‌های سیستم' },
  { name: 'VENDOR', label: 'فروشنده گل و گیاه', description: 'مدیریت فروشگاه و محصولات متعلق به خود' },
  { name: 'CUSTOMER', label: 'مشتری عادی', description: 'ثبت سفارش و مدیریت آدرس‌های شخصی' },
] as const;

const defaultRolePermissions: Record<string, string[]> = {
  ADMIN: [
    'manage:all',
    'create:Cart', 'read:Cart', 'update:Cart', 'delete:Cart',
    'create:PlatformPromotion', 'read:PlatformPromotion', 'update:PlatformPromotion', 'delete:PlatformPromotion',
    'create:Coupon', 'read:Coupon', 'update:Coupon', 'delete:Coupon',
    'create:PaymentGatewayConfig', 'read:PaymentGatewayConfig', 'update:PaymentGatewayConfig',
    'create:CommissionRule', 'read:CommissionRule', 'update:CommissionRule', 'delete:CommissionRule',
    'read:StoreWallet', 'update:StoreWallet', 'create:WalletTransaction', 'read:WalletTransaction',
    'create:SupportTicket', 'read:SupportTicket', 'update:SupportTicket', 'create:SupportTicketNote', 'read:SupportTicketNote',
  ],
  VENDOR: [
    'read:Product', 'read:Category', 'read:Store', 'read:StoreWallet', 'read:WalletTransaction',
    'read:SupportTicket', 'create:SupportTicketNote', 'read:SupportTicketNote',
    'create:Cart', 'read:Cart', 'update:Cart', 'delete:Cart',
    'create:Store', 'update:Store', 'delete:Store',
    'create:Product', 'update:Product', 'delete:Product',
    'create:VendorDiscount', 'read:VendorDiscount', 'update:VendorDiscount', 'delete:VendorDiscount',
    'create:File',
  ],
  CUSTOMER: [
    'read:Product', 'read:Category', 'read:Store',
    'read:VendorDiscount', 'read:PlatformPromotion', 'read:Coupon',
    'create:Cart', 'read:Cart', 'update:Cart', 'delete:Cart',
    'create:Order', 'read:Order', 'update:Order',
    'create:SupportTicket', 'read:SupportTicket', 'create:SupportTicketNote', 'read:SupportTicketNote',
    'create:Payment', 'read:Payment',
    'create:UserAddress', 'read:UserAddress', 'delete:UserAddress',
    'create:Review', 'read:Review',
  ],
};

const demoPhones = [
  '09120000000',
  '09121111111',
  '09122222222',
  '09123333333',
  '09124444444',
  '09125555555',
];

const productImage = 'https://images.example.com/flowers/demo.jpg';

const dec = (value: number) => new Prisma.Decimal(value);

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

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
    if (!role) continue;

    for (const key of permissionKeys) {
      const permissionId = permissionIdByKey.get(key);
      if (!permissionId) continue;

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

async function ensureDefaultPaymentGatewayConfig() {
  console.log('Ensuring default payment gateway config exists...');

  return prisma.paymentGatewayConfig.upsert({
    where: { key: 'mock-default' },
    update: {
      displayName: 'Mock Gateway',
      driver: 'mock',
      isActive: true,
      isDefault: true,
      priority: 1,
      sandboxMode: true,
      callbackUrl: 'http://localhost:3000/v1/payments/callback/mock-default',
      returnUrl: 'http://localhost:3000/payment-result',
      merchantConfig: { merchantId: 'mock-merchant' },
      technicalConfig: {
        baseUrl: 'https://mock-gateway.local',
        paymentWindowMinutes: 15,
        maxRetryAttempts: 3,
      },
      notes: 'درگاه پیش فرض تستی برای توسعه',
    },
    create: {
      key: 'mock-default',
      displayName: 'Mock Gateway',
      driver: 'mock',
      isActive: true,
      isDefault: true,
      priority: 1,
      sandboxMode: true,
      callbackUrl: 'http://localhost:3000/v1/payments/callback/mock-default',
      returnUrl: 'http://localhost:3000/payment-result',
      merchantConfig: { merchantId: 'mock-merchant' },
      technicalConfig: {
        baseUrl: 'https://mock-gateway.local',
        paymentWindowMinutes: 15,
        maxRetryAttempts: 3,
      },
      notes: 'درگاه پیش فرض تستی برای توسعه',
    },
  });
}

async function ensureUsers(roleIds: Map<string, { id: number }>) {
  console.log('Creating demo users...');

  const users = {
    admin: await prisma.user.upsert({
      where: { phoneNumber: '09120000000' },
      update: { fullName: 'مدیر اصلی', isActive: true, email: 'admin@gol.local' },
      create: { phoneNumber: '09120000000', fullName: 'مدیر اصلی', isActive: true, email: 'admin@gol.local' },
    }),
    vendorOne: await prisma.user.upsert({
      where: { phoneNumber: '09121111111' },
      update: { fullName: 'فروشنده اول', isActive: true, email: 'vendor1@gol.local' },
      create: { phoneNumber: '09121111111', fullName: 'فروشنده اول', isActive: true, email: 'vendor1@gol.local' },
    }),
    vendorTwo: await prisma.user.upsert({
      where: { phoneNumber: '09122222222' },
      update: { fullName: 'فروشنده دوم', isActive: true, email: 'vendor2@gol.local' },
      create: { phoneNumber: '09122222222', fullName: 'فروشنده دوم', isActive: true, email: 'vendor2@gol.local' },
    }),
    customerOne: await prisma.user.upsert({
      where: { phoneNumber: '09123333333' },
      update: { fullName: 'مشتری اول', isActive: true, email: 'customer1@gol.local' },
      create: { phoneNumber: '09123333333', fullName: 'مشتری اول', isActive: true, email: 'customer1@gol.local' },
    }),
    customerTwo: await prisma.user.upsert({
      where: { phoneNumber: '09124444444' },
      update: { fullName: 'مشتری دوم', isActive: true, email: 'customer2@gol.local' },
      create: { phoneNumber: '09124444444', fullName: 'مشتری دوم', isActive: true, email: 'customer2@gol.local' },
    }),
    customerThree: await prisma.user.upsert({
      where: { phoneNumber: '09125555555' },
      update: { fullName: 'مشتری سوم', isActive: true, email: 'customer3@gol.local' },
      create: { phoneNumber: '09125555555', fullName: 'مشتری سوم', isActive: true, email: 'customer3@gol.local' },
    }),
  };

  const assignments: Array<[keyof typeof users, 'ADMIN' | 'VENDOR' | 'CUSTOMER']> = [
    ['admin', 'ADMIN'],
    ['vendorOne', 'VENDOR'],
    ['vendorTwo', 'VENDOR'],
    ['customerOne', 'CUSTOMER'],
    ['customerTwo', 'CUSTOMER'],
    ['customerThree', 'CUSTOMER'],
  ];

  for (const [userKey, roleName] of assignments) {
    const role = roleIds.get(roleName);
    if (!role) continue;

    await prisma.usersOnRoles.upsert({
      where: {
        userId_roleId: {
          userId: users[userKey].id,
          roleId: role.id,
        },
      },
      update: {},
      create: {
        userId: users[userKey].id,
        roleId: role.id,
      },
    });
  }

  return users;
}

async function upsertAddress(data: {
  userId: number;
  title: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  isDefault: boolean;
}) {
  const existing = await prisma.userAddress.findFirst({
    where: {
      userId: data.userId,
      title: data.title,
    },
  });

  if (existing) {
    return prisma.userAddress.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.userAddress.create({ data });
}

async function upsertOtp(phoneNumber: string, code: string) {
  const existing = await prisma.otpCode.findFirst({ where: { phoneNumber, code } });

  if (existing) {
    return prisma.otpCode.update({
      where: { id: existing.id },
      data: { expiresAt: daysFromNow(1) },
    });
  }

  return prisma.otpCode.create({
    data: { phoneNumber, code, expiresAt: daysFromNow(1) },
  });
}

async function seedAddresses(users: Awaited<ReturnType<typeof ensureUsers>>) {
  console.log('Creating addresses and OTP data...');

  await upsertAddress({
    userId: users.customerOne.id,
    title: 'خانه',
    address: 'تهران، خیابان آزادی، پلاک 101',
    city: 'تهران',
    lat: 35.7001,
    lng: 51.338,
    isDefault: true,
  });
  await upsertAddress({
    userId: users.customerTwo.id,
    title: 'محل کار',
    address: 'تهران، خیابان مطهری، پلاک 45',
    city: 'تهران',
    lat: 35.7212,
    lng: 51.421,
    isDefault: true,
  });
  await upsertAddress({
    userId: users.customerThree.id,
    title: 'خانه',
    address: 'کرج، جهانشهر، پلاک 12',
    city: 'کرج',
    lat: 35.832,
    lng: 50.991,
    isDefault: true,
  });
  await upsertAddress({
    userId: users.vendorOne.id,
    title: 'آدرس فروشگاه',
    address: 'تهران، سعادت آباد، مجتمع گلستان',
    city: 'تهران',
    lat: 35.789,
    lng: 51.376,
    isDefault: true,
  });
  await upsertAddress({
    userId: users.vendorTwo.id,
    title: 'آدرس فروشگاه',
    address: 'تهران، ونک، خیابان ملاصدرا',
    city: 'تهران',
    lat: 35.757,
    lng: 51.409,
    isDefault: true,
  });

  await upsertOtp(users.customerOne.phoneNumber, '111111');
  await upsertOtp(users.customerTwo.phoneNumber, '222222');
  await upsertOtp(users.vendorOne.phoneNumber, '333333');
}

async function upsertProductType(data: {
  name: string;
  slug: string;
  description: string;
  image: string;
  allowedElements: Prisma.InputJsonValue;
}) {
  return prisma.productType.upsert({
    where: { slug: data.slug },
    update: data,
    create: data,
  });
}

async function upsertCategory(data: {
  name: string;
  slug: string;
  description: string;
  image: string;
  isCampaign?: boolean;
  parentId?: number | null;
}) {
  return prisma.category.upsert({
    where: { slug: data.slug },
    update: data,
    create: data,
  });
}

async function upsertProductElement(data: {
  name: string;
  type: ElementType;
  unit: string;
  image: string;
}) {
  return prisma.productElement.upsert({
    where: { name: data.name },
    update: data,
    create: data,
  });
}

async function upsertStore(data: Prisma.StoreUncheckedCreateInput) {
  return prisma.store.upsert({
    where: { slug: String(data.slug) },
    update: data,
    create: data,
  });
}

async function upsertProduct(data: Prisma.ProductUncheckedCreateInput) {
  return prisma.product.upsert({
    where: { slug: String(data.slug) },
    update: data,
    create: data,
  });
}

async function resetProductComposition(productId: number, items: Array<{ elementId: number; quantity: number; elementType: ElementType }>) {
  await prisma.productComposition.deleteMany({ where: { productId } });
  await prisma.productComposition.createMany({ data: items.map((item) => ({ productId, ...item })) });
}

async function seedCatalogAndStores(users: Awaited<ReturnType<typeof ensureUsers>>) {
  console.log('Creating catalog, stores, and products...');

  const bouquetType = await upsertProductType({
    name: 'دسته گل',
    slug: 'bouquet',
    description: 'محصولات دسته گل',
    image: productImage,
    allowedElements: [ElementType.FLOWER, ElementType.FILLER, ElementType.ACCESSORY] as unknown as Prisma.InputJsonValue,
  });

  const plantType = await upsertProductType({
    name: 'گیاه آپارتمانی',
    slug: 'indoor-plant',
    description: 'گیاهان آپارتمانی و تزئینی',
    image: productImage,
    allowedElements: [ElementType.BASE, ElementType.ACCESSORY] as unknown as Prisma.InputJsonValue,
  });

  const occasionCategory = await upsertCategory({
    name: 'مناسبتی',
    slug: 'occasion',
    description: 'گل‌های مناسبتی',
    image: productImage,
    isCampaign: true,
  });

  const birthdayCategory = await upsertCategory({
    name: 'تولد',
    slug: 'birthday',
    description: 'گل‌های مناسب تولد',
    image: productImage,
    parentId: occasionCategory.id,
  });

  const plantCategory = await upsertCategory({
    name: 'گیاهان سبز',
    slug: 'green-plants',
    description: 'گیاهان خانگی',
    image: productImage,
  });

  const rose = await upsertProductElement({ name: 'رز قرمز', type: ElementType.FLOWER, unit: 'شاخه', image: productImage });
  const lily = await upsertProductElement({ name: 'لیلیوم سفید', type: ElementType.FLOWER, unit: 'شاخه', image: productImage });
  const eucalyptus = await upsertProductElement({ name: 'اکالیپتوس', type: ElementType.FILLER, unit: 'شاخه', image: productImage });
  const ceramicPot = await upsertProductElement({ name: 'گلدان سرامیکی', type: ElementType.ACCESSORY, unit: 'عدد', image: productImage });

  const storeOne = await upsertStore({
    name: 'فلوریا',
    slug: 'floria',
    description: 'ارسال سریع گل در تهران',
    logo: productImage,
    lat: 35.789,
    lng: 51.376,
    address: 'تهران، سعادت آباد',
    sameDayDelivery: true,
    hasExpressDelivery: true,
    minDeliveryHours: 2,
    maxDeliveryHours: 6,
    expressDeliveryHours: 1,
    deliveryWindows: [
      { key: 'today-12-15', label: 'امروز 12 تا 15' },
      { key: 'today-18-21', label: 'امروز 18 تا 21' },
    ] as unknown as Prisma.InputJsonValue,
    isVerified: true,
    ownerId: users.vendorOne.id,
    customerRatingAverage: dec(4.7),
    customerRatingCount: 18,
    vendorHealthScore: 88,
    vendorHealthStatus: VendorHealthStatus.GOOD,
    vendorHealthCalculatedAt: new Date(),
    vendorHealthSnapshot: {
      reviewCount: 18,
      refundTickets: 1,
      unresolvedTickets: 1,
    } as Prisma.InputJsonValue,
  });

  const storeTwo = await upsertStore({
    name: 'سبزکده',
    slug: 'sabzkadeh',
    description: 'فروش تخصصی گیاه و باکس گل',
    logo: productImage,
    lat: 35.757,
    lng: 51.409,
    address: 'تهران، ونک',
    sameDayDelivery: true,
    hasExpressDelivery: false,
    minDeliveryHours: 3,
    maxDeliveryHours: 8,
    deliveryWindows: [
      { key: 'tomorrow-10-14', label: 'فردا 10 تا 14' },
    ] as unknown as Prisma.InputJsonValue,
    isVerified: true,
    ownerId: users.vendorTwo.id,
    customerRatingAverage: dec(4.2),
    customerRatingCount: 9,
    vendorHealthScore: 72,
    vendorHealthStatus: VendorHealthStatus.WATCHLIST,
    vendorHealthCalculatedAt: new Date(),
    vendorHealthSnapshot: {
      reviewCount: 9,
      refundTickets: 2,
      unresolvedTickets: 2,
    } as Prisma.InputJsonValue,
  });

  const productOne = await upsertProduct({
    name: 'دسته گل رز کلاسیک',
    slug: 'classic-red-rose-bouquet',
    description: 'دسته گل رز قرمز مناسب مناسبت‌های عاشقانه',
    shortDescription: 'رز قرمز با طراحی کلاسیک',
    quantity: 20,
    price: 950000,
    discountPrice: 890000,
    mainImage: productImage,
    images: [productImage] as unknown as Prisma.InputJsonValue,
    storeId: storeOne.id,
    productTypeId: bouquetType.id,
    categoryId: birthdayCategory.id,
  });

  const productTwo = await upsertProduct({
    name: 'باکس گل سفید طلایی',
    slug: 'white-gold-flower-box',
    description: 'باکس گل لوکس با ترکیب رنگ سفید و طلایی',
    shortDescription: 'باکس گل لوکس',
    quantity: 12,
    price: 1250000,
    discountPrice: null,
    mainImage: productImage,
    images: [productImage] as unknown as Prisma.InputJsonValue,
    storeId: storeOne.id,
    productTypeId: bouquetType.id,
    categoryId: occasionCategory.id,
  });

  const productThree = await upsertProduct({
    name: 'فیکوس الاستیکا',
    slug: 'ficus-elastica',
    description: 'گیاه آپارتمانی فیکوس با گلدان تزئینی',
    shortDescription: 'فیکوس آپارتمانی',
    quantity: 15,
    price: 780000,
    discountPrice: 730000,
    mainImage: productImage,
    images: [productImage] as unknown as Prisma.InputJsonValue,
    storeId: storeTwo.id,
    productTypeId: plantType.id,
    categoryId: plantCategory.id,
  });

  const productFour = await upsertProduct({
    name: 'سانسوریا ابلق',
    slug: 'variegated-sansevieria',
    description: 'گیاه مقاوم و مناسب هدیه',
    shortDescription: 'سانسوریا ابلق',
    quantity: 10,
    price: 990000,
    discountPrice: null,
    mainImage: productImage,
    images: [productImage] as unknown as Prisma.InputJsonValue,
    storeId: storeTwo.id,
    productTypeId: plantType.id,
    categoryId: plantCategory.id,
  });

  await resetProductComposition(productOne.id, [
    { elementId: rose.id, quantity: 20, elementType: ElementType.FLOWER },
    { elementId: eucalyptus.id, quantity: 6, elementType: ElementType.FILLER },
  ]);
  await resetProductComposition(productTwo.id, [
    { elementId: lily.id, quantity: 10, elementType: ElementType.FLOWER },
    { elementId: eucalyptus.id, quantity: 4, elementType: ElementType.FILLER },
  ]);
  await resetProductComposition(productThree.id, [
    { elementId: ceramicPot.id, quantity: 1, elementType: ElementType.ACCESSORY },
  ]);
  await resetProductComposition(productFour.id, [
    { elementId: ceramicPot.id, quantity: 1, elementType: ElementType.ACCESSORY },
  ]);

  return {
    productTypes: { bouquetType, plantType },
    categories: { occasionCategory, birthdayCategory, plantCategory },
    stores: { storeOne, storeTwo },
    products: { productOne, productTwo, productThree, productFour },
  };
}

async function upsertCommissionRule(data: Prisma.CommissionRuleUncheckedCreateInput) {
  const existing = await prisma.commissionRule.findFirst({
    where: {
      title: String(data.title),
      scope: data.scope as CommissionRuleScope,
      storeId: data.storeId ?? null,
    },
  });

  if (existing) {
    return prisma.commissionRule.update({ where: { id: existing.id }, data });
  }

  return prisma.commissionRule.create({ data });
}

async function upsertVendorDiscount(data: Prisma.VendorDiscountUncheckedCreateInput) {
  const existing = await prisma.vendorDiscount.findFirst({
    where: {
      productId: data.productId,
      title: String(data.title),
    },
  });

  if (existing) {
    return prisma.vendorDiscount.update({ where: { id: existing.id }, data });
  }

  return prisma.vendorDiscount.create({ data });
}

async function upsertPlatformPromotion(data: Prisma.PlatformPromotionUncheckedCreateInput & {
  products: { create: Array<{ productId: number }> };
  stores: { create: Array<{ storeId: number }> };
  categories: { create: Array<{ categoryId: number }> };
}) {
  const existing = await prisma.platformPromotion.findFirst({ where: { title: String(data.title) } });

  const baseData = {
    title: data.title,
    description: data.description,
    layer: data.layer,
    valueType: data.valueType,
    value: data.value,
    priority: data.priority,
    isActive: data.isActive,
    isExclusive: data.isExclusive,
    allowVendorDiscountStacking: data.allowVendorDiscountStacking,
    allowCouponStacking: data.allowCouponStacking,
    promotedVisibility: data.promotedVisibility,
    createdByUserId: data.createdByUserId,
    startAt: data.startAt,
    endAt: data.endAt,
  };

  if (existing) {
    await prisma.promotionOnProducts.deleteMany({ where: { promotionId: existing.id } });
    await prisma.promotionOnStores.deleteMany({ where: { promotionId: existing.id } });
    await prisma.promotionOnCategories.deleteMany({ where: { promotionId: existing.id } });
    return prisma.platformPromotion.update({
      where: { id: existing.id },
      data: {
        ...baseData,
        products: data.products,
        stores: data.stores,
        categories: data.categories,
      },
    });
  }

  return prisma.platformPromotion.create({ data: { ...baseData, products: data.products, stores: data.stores, categories: data.categories } });
}

async function upsertCoupon(data: Prisma.CouponUncheckedCreateInput & {
  stores: { create: Array<{ storeId: number }> };
  categories: { create: Array<{ categoryId: number }> };
  products: { create: Array<{ productId: number }> };
}) {
  const existing = await prisma.coupon.findUnique({ where: { code: String(data.code) } });
  const baseData = {
    code: data.code,
    title: data.title,
    description: data.description,
    layer: data.layer,
    valueType: data.valueType,
    value: data.value,
    priority: data.priority,
    isActive: data.isActive,
    isExclusive: data.isExclusive,
    applyOn: data.applyOn,
    firstOrderOnly: data.firstOrderOnly,
    minOrderAmount: data.minOrderAmount,
    usageLimit: data.usageLimit,
    perUserUsageLimit: data.perUserUsageLimit,
    allowVendorDiscountStacking: data.allowVendorDiscountStacking,
    allowPlatformPromotionStacking: data.allowPlatformPromotionStacking,
    createdByUserId: data.createdByUserId,
    startAt: data.startAt,
    endAt: data.endAt,
  };

  if (existing) {
    await prisma.couponOnProducts.deleteMany({ where: { couponId: existing.id } });
    await prisma.couponOnStores.deleteMany({ where: { couponId: existing.id } });
    await prisma.couponOnCategories.deleteMany({ where: { couponId: existing.id } });
    return prisma.coupon.update({
      where: { id: existing.id },
      data: {
        ...baseData,
        stores: data.stores,
        categories: data.categories,
        products: data.products,
      },
    });
  }

  return prisma.coupon.create({ data: { ...baseData, stores: data.stores, categories: data.categories, products: data.products } });
}

async function seedPricingAndPolicies(
  adminId: number,
  stores: Awaited<ReturnType<typeof seedCatalogAndStores>>['stores'],
  products: Awaited<ReturnType<typeof seedCatalogAndStores>>['products'],
  categories: Awaited<ReturnType<typeof seedCatalogAndStores>>['categories'],
) {
  console.log('Creating pricing rules, promotions, and coupons...');

  const globalRule = await upsertCommissionRule({
    scope: CommissionRuleScope.GLOBAL,
    title: 'قاعده سراسری پلتفرم',
    description: 'کارمزد پیش فرض برای همه سفارش‌ها',
    commissionRate: dec(12),
    systemServiceFeeRate: dec(0),
    systemServiceFeeFixed: dec(15000),
    settlementHoldDays: 7,
    complaintWindowHours: 24,
    autoReleaseEnabled: true,
    priority: 100,
    isActive: true,
    createdByUserId: adminId,
    reason: 'سیاست پایه مالی',
  });

  const storeSpecificRule = await upsertCommissionRule({
    scope: CommissionRuleScope.STORE,
    storeId: stores.storeTwo.id,
    title: 'قاعده ویژه فروشگاه سبزکده',
    description: 'کارمزد اختصاصی فروشگاه دوم',
    commissionRate: dec(10),
    systemServiceFeeRate: dec(0),
    systemServiceFeeFixed: dec(10000),
    settlementHoldDays: 5,
    complaintWindowHours: 36,
    autoReleaseEnabled: true,
    priority: 10,
    isActive: true,
    createdByUserId: adminId,
    reason: 'همکاری ویژه با فروشگاه دوم',
  });

  await upsertVendorDiscount({
    productId: products.productOne.id,
    storeId: stores.storeOne.id,
    title: 'تخفیف رز قرمز',
    description: 'تخفیف مناسبتی روی رز قرمز',
    valueType: DiscountValueType.PERCENTAGE,
    value: dec(8),
    priority: 10,
    isActive: true,
    allowCouponStacking: true,
  });

  await upsertVendorDiscount({
    productId: products.productThree.id,
    storeId: stores.storeTwo.id,
    title: 'تخفیف گیاه هفته',
    description: 'تخفیف ثابت برای گیاه منتخب',
    valueType: DiscountValueType.FIXED_AMOUNT,
    value: dec(50000),
    priority: 20,
    isActive: true,
  });

  const promotion = await upsertPlatformPromotion({
    title: 'کمپین بهار',
    description: 'تخفیف بهاری برای محصولات منتخب',
    layer: DiscountLayer.PLATFORM,
    valueType: DiscountValueType.PERCENTAGE,
    value: dec(5),
    priority: 30,
    isActive: true,
    allowVendorDiscountStacking: true,
    allowCouponStacking: true,
    promotedVisibility: true,
    createdByUserId: adminId,
    startAt: hoursAgo(24),
    endAt: daysFromNow(10),
    products: {
      create: [{ productId: products.productOne.id }, { productId: products.productTwo.id }],
    },
    stores: {
      create: [{ storeId: stores.storeOne.id }],
    },
    categories: {
      create: [{ categoryId: categories.occasionCategory.id }],
    },
  });

  const coupon = await upsertCoupon({
    code: 'SPRING1405',
    title: 'کد تخفیف بهار',
    description: 'تخفیف برای اولین خرید',
    layer: DiscountLayer.COUPON,
    valueType: DiscountValueType.FIXED_AMOUNT,
    value: dec(100000),
    priority: 100,
    isActive: true,
    isExclusive: false,
    applyOn: CouponApplyOn.DISCOUNTED_SUBTOTAL,
    firstOrderOnly: false,
    minOrderAmount: dec(500000),
    usageLimit: 100,
    perUserUsageLimit: 2,
    allowVendorDiscountStacking: true,
    allowPlatformPromotionStacking: true,
    createdByUserId: adminId,
    startAt: hoursAgo(12),
    endAt: daysFromNow(15),
    stores: {
      create: [{ storeId: stores.storeOne.id }],
    },
    categories: {
      create: [{ categoryId: categories.birthdayCategory.id }],
    },
    products: {
      create: [{ productId: products.productOne.id }],
    },
  });

  return { globalRule, storeSpecificRule, promotion, coupon };
}

async function upsertCart(userId: number, items: Array<{ productId: number; quantity: number }>) {
  const cart = await prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  await prisma.cartItem.createMany({
    data: items.map((item) => ({ cartId: cart.id, ...item })),
  });

  return cart;
}

async function seedCarts(
  users: Awaited<ReturnType<typeof ensureUsers>>,
  products: Awaited<ReturnType<typeof seedCatalogAndStores>>['products'],
) {
  console.log('Creating carts...');

  const cartOne = await upsertCart(users.customerOne.id, [
    { productId: products.productOne.id, quantity: 2 },
    { productId: products.productTwo.id, quantity: 1 },
  ]);

  const cartTwo = await upsertCart(users.customerTwo.id, [
    { productId: products.productThree.id, quantity: 1 },
    { productId: products.productFour.id, quantity: 1 },
  ]);

  const cartThree = await upsertCart(users.customerThree.id, [
    { productId: products.productOne.id, quantity: 1 },
  ]);

  return { cartOne, cartTwo, cartThree };
}

async function upsertOrderBySignature(signature: string, data: Prisma.OrderUncheckedCreateInput) {
  const existingEvent = await prisma.domainEvent.findFirst({
    where: {
      aggregateType: 'seed-order',
      summary: signature,
    },
    select: { orderId: true },
  });

  if (existingEvent?.orderId) {
    await prisma.orderItem.deleteMany({ where: { orderId: existingEvent.orderId } });
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: existingEvent.orderId } });
    return prisma.order.update({
      where: { id: existingEvent.orderId },
      data,
    });
  }

  const order = await prisma.order.create({ data });
  await prisma.domainEvent.create({
    data: {
      eventType: DomainEventType.ORDER_CREATED,
      aggregateType: 'seed-order',
      aggregateId: order.id,
      orderId: order.id,
      summary: signature,
      status: DomainEventStatus.PROCESSED,
      processedAt: new Date(),
    },
  });
  return order;
}

async function upsertPaymentByOrder(orderId: number, data: Prisma.PaymentUncheckedCreateInput) {
  return prisma.payment.upsert({
    where: { orderId },
    update: data,
    create: data,
  });
}

async function upsertCouponRedemption(couponId: number, userId: number, orderId: number) {
  return prisma.couponRedemption.upsert({
    where: { orderId },
    update: { couponId, userId },
    create: { couponId, userId, orderId },
  });
}

async function upsertSupportTicket(orderId: number, data: Prisma.SupportTicketUncheckedCreateInput) {
  const existing = await prisma.supportTicket.findFirst({ where: { orderId } });
  if (existing) {
    return prisma.supportTicket.update({ where: { id: existing.id }, data });
  }
  return prisma.supportTicket.create({ data });
}

async function replaceSupportNotes(ticketId: number, notes: Prisma.SupportTicketNoteCreateManyInput[]) {
  await prisma.supportTicketNote.deleteMany({ where: { ticketId } });
  await prisma.supportTicketNote.createMany({ data: notes });
}

async function upsertWallet(storeId: number, data: Prisma.StoreWalletUncheckedCreateInput) {
  return prisma.storeWallet.upsert({
    where: { storeId },
    update: data,
    create: data,
  });
}

async function replaceWalletTransactions(walletId: number, data: Prisma.WalletTransactionCreateManyInput[]) {
  await prisma.walletTransaction.deleteMany({ where: { walletId } });
  await prisma.walletTransaction.createMany({ data });
}

async function upsertDomainEventBySignature(signature: string, data: Prisma.DomainEventUncheckedCreateInput) {
  const existing = await prisma.domainEvent.findFirst({
    where: {
      aggregateType: String(data.aggregateType),
      summary: signature,
    },
  });

  if (existing) {
    return prisma.domainEvent.update({ where: { id: existing.id }, data: { ...data, summary: signature } });
  }

  return prisma.domainEvent.create({ data: { ...data, summary: signature } });
}

async function upsertReviewForOrder(orderId: number, data: { userId: number; productId: number; rating: number; comment?: string | null }) {
  return prisma.review.upsert({
    where: { orderId },
    update: data,
    create: {
      orderId,
      ...data,
    },
  });
}

async function seedOrdersAndOperations(input: {
  users: Awaited<ReturnType<typeof ensureUsers>>;
  stores: Awaited<ReturnType<typeof seedCatalogAndStores>>['stores'];
  products: Awaited<ReturnType<typeof seedCatalogAndStores>>['products'];
  paymentGatewayConfigId: number;
  commissionRuleId: number;
  couponId: number;
}) {
  console.log('Creating orders, payments, reviews, tickets, wallets, and domain events...');

  const customerOneAddress = await prisma.userAddress.findFirstOrThrow({
    where: { userId: input.users.customerOne.id, isDefault: true },
  });
  const customerTwoAddress = await prisma.userAddress.findFirstOrThrow({
    where: { userId: input.users.customerTwo.id, isDefault: true },
  });
  const customerThreeAddress = await prisma.userAddress.findFirstOrThrow({
    where: { userId: input.users.customerThree.id, isDefault: true },
  });

  const deliveredAt = hoursAgo(30);
  const paidAt = hoursAgo(8);
  const shippedAt = hoursAgo(6);
  const acceptedAt = hoursAgo(10);
  const pendingCreatedAt = hoursAgo(2);

  const orderOne = await upsertOrderBySignature('seed-order-1', {
    userId: input.users.customerOne.id,
    totalAmount: dec(890000),
    subtotalBaseAmount: dec(950000),
    subtotalAmount: dec(890000),
    subtotalAfterLineDiscounts: dec(890000),
    deliveryFee: dec(0),
    lineDiscountAmount: dec(60000),
    couponDiscountAmount: dec(0),
    discountAmount: dec(60000),
    commissionRuleId: input.commissionRuleId,
    settlementStatus: SettlementStatus.ON_HOLD,
    commissionRate: dec(12),
    commissionBaseAmount: dec(890000),
    platformCommissionAmount: dec(106800),
    systemServiceFeeAmount: dec(15000),
    platformTotalShareAmount: dec(121800),
    vendorShareAmount: dec(768200),
    settlementHoldDays: 7,
    complaintWindowHours: 24,
    settlementAutoReleaseEnabled: false,
    settlementEligibleAt: daysFromNow(5),
    earningsHeldAt: hoursAgo(20),
    pricingSnapshot: { pricing: { totalAmount: 890000, subtotalBaseAmount: 950000 } } as Prisma.InputJsonValue,
    financialSnapshot: { appliedRuleId: input.commissionRuleId, vendorShareAmount: 768200 } as Prisma.InputJsonValue,
    status: OrderStatus.DELIVERED,
    paymentStatus: PaymentStatus.PAID,
    paymentMethod: PaymentMethod.COD,
    shippingAddressId: customerOneAddress.id,
    shippingAddressTitle: customerOneAddress.title,
    shippingAddressText: customerOneAddress.address,
    shippingCity: customerOneAddress.city,
    shippingLat: customerOneAddress.lat,
    shippingLng: customerOneAddress.lng,
    storeId: input.stores.storeOne.id,
    storeName: input.stores.storeOne.name,
    storeSlug: input.stores.storeOne.slug,
    deliveryType: DeliveryType.STANDARD,
    deliveryWindowLabel: 'امروز 18 تا 21',
    estimatedDeliveryMinHours: 2,
    estimatedDeliveryMaxHours: 6,
    acceptedAt,
    shippedAt,
    deliveredAt,
    orderItems: {
      create: [
        {
          productId: input.products.productOne.id,
          quantity: 1,
          price: dec(890000),
          pricingSnapshot: { finalUnitPriceBeforeCoupon: 890000 } as Prisma.InputJsonValue,
          productName: input.products.productOne.name,
          productSlug: input.products.productOne.slug,
          productImage: input.products.productOne.mainImage,
          storeId: input.stores.storeOne.id,
          storeName: input.stores.storeOne.name,
          storeSlug: input.stores.storeOne.slug,
        },
      ],
    },
    statusHistories: {
      create: [
        { fromStatus: null, toStatus: OrderStatus.PENDING, actorType: OrderActorType.CUSTOMER, actorUserId: input.users.customerOne.id, note: 'سفارش ایجاد شد' },
        { fromStatus: OrderStatus.PENDING, toStatus: OrderStatus.ACCEPTED, actorType: OrderActorType.VENDOR, actorUserId: input.users.vendorOne.id, note: 'سفارش تایید شد' },
        { fromStatus: OrderStatus.ACCEPTED, toStatus: OrderStatus.SHIPPED, actorType: OrderActorType.VENDOR, actorUserId: input.users.vendorOne.id, note: 'سفارش ارسال شد' },
        { fromStatus: OrderStatus.SHIPPED, toStatus: OrderStatus.DELIVERED, actorType: OrderActorType.VENDOR, actorUserId: input.users.vendorOne.id, note: 'سفارش تحویل شد' },
      ],
    },
  });

  const orderTwo = await upsertOrderBySignature('seed-order-2', {
    userId: input.users.customerTwo.id,
    totalAmount: dec(1150000),
    subtotalBaseAmount: dec(1250000),
    subtotalAmount: dec(1187500),
    subtotalAfterLineDiscounts: dec(1187500),
    deliveryFee: dec(0),
    lineDiscountAmount: dec(62500),
    couponDiscountAmount: dec(37500),
    discountAmount: dec(100000),
    commissionRuleId: input.commissionRuleId,
    settlementStatus: SettlementStatus.PENDING,
    commissionRate: dec(12),
    commissionBaseAmount: dec(1187500),
    platformCommissionAmount: dec(142500),
    systemServiceFeeAmount: dec(15000),
    platformTotalShareAmount: dec(157500),
    vendorShareAmount: dec(1030000),
    settlementHoldDays: 7,
    complaintWindowHours: 24,
    settlementAutoReleaseEnabled: true,
    couponCode: 'SPRING1405',
    couponTitle: 'کد تخفیف بهار',
    couponApplyOn: CouponApplyOn.DISCOUNTED_SUBTOTAL,
    pricingSnapshot: { pricing: { totalAmount: 1150000, subtotalBaseAmount: 1250000 } } as Prisma.InputJsonValue,
    financialSnapshot: { appliedRuleId: input.commissionRuleId, vendorShareAmount: 1030000 } as Prisma.InputJsonValue,
    status: OrderStatus.SHIPPED,
    paymentStatus: PaymentStatus.PAID,
    paymentMethod: PaymentMethod.ONLINE,
    shippingAddressId: customerTwoAddress.id,
    shippingAddressTitle: customerTwoAddress.title,
    shippingAddressText: customerTwoAddress.address,
    shippingCity: customerTwoAddress.city,
    shippingLat: customerTwoAddress.lat,
    shippingLng: customerTwoAddress.lng,
    storeId: input.stores.storeOne.id,
    storeName: input.stores.storeOne.name,
    storeSlug: input.stores.storeOne.slug,
    deliveryType: DeliveryType.EXPRESS,
    deliveryWindowLabel: 'امروز 12 تا 15',
    estimatedDeliveryMinHours: 1,
    estimatedDeliveryMaxHours: 1,
    acceptedAt: hoursAgo(12),
    shippedAt,
    orderItems: {
      create: [
        {
          productId: input.products.productTwo.id,
          quantity: 1,
          price: dec(1187500),
          pricingSnapshot: { finalUnitPriceBeforeCoupon: 1187500 } as Prisma.InputJsonValue,
          productName: input.products.productTwo.name,
          productSlug: input.products.productTwo.slug,
          productImage: input.products.productTwo.mainImage,
          storeId: input.stores.storeOne.id,
          storeName: input.stores.storeOne.name,
          storeSlug: input.stores.storeOne.slug,
        },
      ],
    },
    statusHistories: {
      create: [
        { fromStatus: null, toStatus: OrderStatus.PENDING, actorType: OrderActorType.CUSTOMER, actorUserId: input.users.customerTwo.id, note: 'سفارش ایجاد شد' },
        { fromStatus: OrderStatus.PENDING, toStatus: OrderStatus.PAID, actorType: OrderActorType.CUSTOMER, actorUserId: input.users.customerTwo.id, note: 'پرداخت موفق بود' },
        { fromStatus: OrderStatus.PAID, toStatus: OrderStatus.ACCEPTED, actorType: OrderActorType.VENDOR, actorUserId: input.users.vendorOne.id, note: 'فروشنده سفارش را پذیرفت' },
        { fromStatus: OrderStatus.ACCEPTED, toStatus: OrderStatus.SHIPPED, actorType: OrderActorType.VENDOR, actorUserId: input.users.vendorOne.id, note: 'سفارش ارسال شد' },
      ],
    },
  });

  const orderThree = await upsertOrderBySignature('seed-order-3', {
    userId: input.users.customerThree.id,
    totalAmount: dec(720000),
    subtotalBaseAmount: dec(780000),
    subtotalAmount: dec(730000),
    subtotalAfterLineDiscounts: dec(730000),
    deliveryFee: dec(0),
    lineDiscountAmount: dec(50000),
    couponDiscountAmount: dec(0),
    discountAmount: dec(50000),
    commissionRuleId: input.commissionRuleId,
    settlementStatus: SettlementStatus.REVERSED,
    commissionRate: dec(10),
    commissionBaseAmount: dec(730000),
    platformCommissionAmount: dec(73000),
    systemServiceFeeAmount: dec(10000),
    platformTotalShareAmount: dec(83000),
    vendorShareAmount: dec(647000),
    settlementHoldDays: 5,
    complaintWindowHours: 36,
    settlementAutoReleaseEnabled: true,
    settlementEligibleAt: hoursAgo(16),
    earningsHeldAt: hoursAgo(18),
    earningsReleasedAt: hoursAgo(17),
    settlementReleasedAmount: dec(647000),
    settlementReversedAmount: dec(147000),
    pricingSnapshot: { pricing: { totalAmount: 720000, subtotalBaseAmount: 780000 } } as Prisma.InputJsonValue,
    financialSnapshot: { appliedRuleId: input.commissionRuleId, vendorShareAmount: 647000 } as Prisma.InputJsonValue,
    status: OrderStatus.CANCELLED_BY_CUSTOMER,
    paymentStatus: PaymentStatus.CANCELLED,
    paymentMethod: PaymentMethod.ONLINE,
    shippingAddressId: customerThreeAddress.id,
    shippingAddressTitle: customerThreeAddress.title,
    shippingAddressText: customerThreeAddress.address,
    shippingCity: customerThreeAddress.city,
    shippingLat: customerThreeAddress.lat,
    shippingLng: customerThreeAddress.lng,
    storeId: input.stores.storeTwo.id,
    storeName: input.stores.storeTwo.name,
    storeSlug: input.stores.storeTwo.slug,
    deliveryType: DeliveryType.STANDARD,
    deliveryWindowLabel: 'فردا 10 تا 14',
    estimatedDeliveryMinHours: 3,
    estimatedDeliveryMaxHours: 8,
    acceptedAt: hoursAgo(24),
    cancelledAt: hoursAgo(20),
    orderItems: {
      create: [
        {
          productId: input.products.productThree.id,
          quantity: 1,
          price: dec(730000),
          pricingSnapshot: { finalUnitPriceBeforeCoupon: 730000 } as Prisma.InputJsonValue,
          productName: input.products.productThree.name,
          productSlug: input.products.productThree.slug,
          productImage: input.products.productThree.mainImage,
          storeId: input.stores.storeTwo.id,
          storeName: input.stores.storeTwo.name,
          storeSlug: input.stores.storeTwo.slug,
        },
      ],
    },
    statusHistories: {
      create: [
        { fromStatus: null, toStatus: OrderStatus.PENDING, actorType: OrderActorType.CUSTOMER, actorUserId: input.users.customerThree.id, note: 'سفارش ایجاد شد' },
        { fromStatus: OrderStatus.PENDING, toStatus: OrderStatus.PAID, actorType: OrderActorType.CUSTOMER, actorUserId: input.users.customerThree.id, note: 'پرداخت موفق بود' },
        { fromStatus: OrderStatus.PAID, toStatus: OrderStatus.ACCEPTED, actorType: OrderActorType.VENDOR, actorUserId: input.users.vendorTwo.id, note: 'سفارش تایید شد' },
        { fromStatus: OrderStatus.ACCEPTED, toStatus: OrderStatus.CANCELLED_BY_CUSTOMER, actorType: OrderActorType.CUSTOMER, actorUserId: input.users.customerThree.id, note: 'لغو توسط مشتری' },
      ],
    },
  });

  const orderFour = await upsertOrderBySignature('seed-order-4', {
    userId: input.users.customerOne.id,
    totalAmount: dec(990000),
    subtotalBaseAmount: dec(990000),
    subtotalAmount: dec(990000),
    subtotalAfterLineDiscounts: dec(990000),
    deliveryFee: dec(0),
    lineDiscountAmount: dec(0),
    couponDiscountAmount: dec(0),
    discountAmount: dec(0),
    commissionRuleId: input.commissionRuleId,
    settlementStatus: SettlementStatus.PENDING,
    commissionRate: dec(10),
    commissionBaseAmount: dec(990000),
    platformCommissionAmount: dec(99000),
    systemServiceFeeAmount: dec(10000),
    platformTotalShareAmount: dec(109000),
    vendorShareAmount: dec(881000),
    settlementHoldDays: 5,
    complaintWindowHours: 36,
    settlementAutoReleaseEnabled: true,
    status: OrderStatus.PENDING,
    paymentStatus: PaymentStatus.PENDING,
    paymentMethod: PaymentMethod.COD,
    shippingAddressId: customerOneAddress.id,
    shippingAddressTitle: customerOneAddress.title,
    shippingAddressText: customerOneAddress.address,
    shippingCity: customerOneAddress.city,
    shippingLat: customerOneAddress.lat,
    shippingLng: customerOneAddress.lng,
    storeId: input.stores.storeTwo.id,
    storeName: input.stores.storeTwo.name,
    storeSlug: input.stores.storeTwo.slug,
    deliveryType: DeliveryType.STANDARD,
    estimatedDeliveryMinHours: 3,
    estimatedDeliveryMaxHours: 8,
    createdAt: pendingCreatedAt,
    updatedAt: pendingCreatedAt,
    orderItems: {
      create: [
        {
          productId: input.products.productFour.id,
          quantity: 1,
          price: dec(990000),
          pricingSnapshot: { finalUnitPriceBeforeCoupon: 990000 } as Prisma.InputJsonValue,
          productName: input.products.productFour.name,
          productSlug: input.products.productFour.slug,
          productImage: input.products.productFour.mainImage,
          storeId: input.stores.storeTwo.id,
          storeName: input.stores.storeTwo.name,
          storeSlug: input.stores.storeTwo.slug,
        },
      ],
    },
    statusHistories: {
      create: [
        { fromStatus: null, toStatus: OrderStatus.PENDING, actorType: OrderActorType.CUSTOMER, actorUserId: input.users.customerOne.id, note: 'سفارش در انتظار تایید است' },
      ],
    },
  });

  const paymentTwo = await upsertPaymentByOrder(orderTwo.id, {
    orderId: orderTwo.id,
    userId: input.users.customerTwo.id,
    gatewayConfigId: input.paymentGatewayConfigId,
    gateway: 'mock',
    gatewayKey: 'mock-default',
    authority: `AUTH-ORDER-${orderTwo.id}`,
    refId: `REF-ORDER-${orderTwo.id}`,
    amount: dec(1150000),
    status: PaymentStatus.PAID,
    refundedAmount: dec(0),
    reviewStatus: PaymentReviewStatus.NONE,
    paymentUrl: 'https://mock-gateway.local/pay/AUTH-ORDER-2',
    initiatedAt: hoursAgo(13),
    verifiedAt: paidAt,
    expiresAt: hoursAgo(12),
    attemptCount: 1,
    gatewaySnapshot: { key: 'mock-default', driver: 'mock' } as Prisma.InputJsonValue,
    rawInitiateData: { orderId: orderTwo.id, attemptCount: 1 } as Prisma.InputJsonValue,
    rawVerifyData: { success: true, refId: 'REF-ORDER-2' } as Prisma.InputJsonValue,
  });

  await upsertPaymentByOrder(orderThree.id, {
    orderId: orderThree.id,
    userId: input.users.customerThree.id,
    gatewayConfigId: input.paymentGatewayConfigId,
    gateway: 'mock',
    gatewayKey: 'mock-default',
    authority: `AUTH-ORDER-${orderThree.id}`,
    amount: dec(720000),
    status: PaymentStatus.CANCELLED,
    refundedAmount: dec(0),
    reviewStatus: PaymentReviewStatus.RESOLVED,
    paymentUrl: 'https://mock-gateway.local/pay/AUTH-ORDER-3',
    initiatedAt: hoursAgo(22),
    reviewedAt: hoursAgo(20),
    reviewedByUserId: input.users.admin.id,
    expiresAt: hoursAgo(21),
    attemptCount: 1,
    failureReason: 'سفارش توسط مشتری لغو شد',
    reviewReason: 'لغو سفارش',
    reviewNote: 'پرداخت متوقف شد',
    gatewaySnapshot: { key: 'mock-default', driver: 'mock' } as Prisma.InputJsonValue,
    rawInitiateData: { orderId: orderThree.id, attemptCount: 1 } as Prisma.InputJsonValue,
    rawVerifyData: { success: false, reason: 'cancelled' } as Prisma.InputJsonValue,
  });

  await upsertCouponRedemption(input.couponId, input.users.customerTwo.id, orderTwo.id);

  const ticket = await upsertSupportTicket(orderOne.id, {
    orderId: orderOne.id,
    customerId: input.users.customerOne.id,
    storeId: input.stores.storeOne.id,
    reason: SupportTicketReason.DAMAGED_FLOWERS,
    status: SupportTicketStatus.RESOLVED,
    title: 'گل‌ها آسیب دیده بودند',
    description: 'بخشی از دسته گل در زمان تحویل خراب شده بود',
    customerEvidence: { imageUrls: ['/uploads/issues/order-1.jpg'] } as Prisma.InputJsonValue,
    internalNote: 'با فروشنده هماهنگ شد',
    financeOutcome: SupportTicketFinanceOutcome.PARTIAL_REFUND,
    financeAmount: dec(150000),
    financeNote: 'بازگشت بخشی از وجه تایید شد',
    settlementBlockedAt: hoursAgo(18),
    escalatedAt: hoursAgo(17),
    resolvedAt: hoursAgo(15),
    resolvedByUserId: input.users.admin.id,
  });

  await replaceSupportNotes(ticket.id, [
    {
      ticketId: ticket.id,
      actorType: SupportTicketActorType.CUSTOMER,
      actorUserId: input.users.customerOne.id,
      message: 'عکس‌های سفارش را ارسال کردم',
      isInternal: false,
    },
    {
      ticketId: ticket.id,
      actorType: SupportTicketActorType.ADMIN,
      actorUserId: input.users.admin.id,
      message: 'موضوع بررسی شد و برای finance ارسال شد',
      isInternal: true,
    },
  ]);

  const walletOne = await upsertWallet(input.stores.storeOne.id, {
    storeId: input.stores.storeOne.id,
    currentBalance: dec(768200),
    availableBalance: dec(0),
    heldBalance: dec(768200),
  });
  const walletTwo = await upsertWallet(input.stores.storeTwo.id, {
    storeId: input.stores.storeTwo.id,
    currentBalance: dec(500000),
    availableBalance: dec(500000),
    heldBalance: dec(0),
  });

  await replaceWalletTransactions(walletOne.id, [
    {
      walletId: walletOne.id,
      storeId: input.stores.storeOne.id,
      orderId: orderOne.id,
      type: WalletTransactionType.ORDER_EARNING,
      direction: WalletTransactionDirection.CREDIT,
      amount: dec(768200),
      title: `درآمد سفارش #${orderOne.id}`,
      description: 'درآمد سفارش در وضعیت hold قرار گرفت',
      metadata: { stage: 'held' } as Prisma.InputJsonValue,
    },
  ]);

  await replaceWalletTransactions(walletTwo.id, [
    {
      walletId: walletTwo.id,
      storeId: input.stores.storeTwo.id,
      orderId: orderThree.id,
      type: WalletTransactionType.ORDER_RELEASE,
      direction: WalletTransactionDirection.CREDIT,
      amount: dec(647000),
      title: `آزادسازی سفارش #${orderThree.id}`,
      description: 'وجه order به available منتقل شد',
      metadata: { stage: 'released' } as Prisma.InputJsonValue,
    },
    {
      walletId: walletTwo.id,
      storeId: input.stores.storeTwo.id,
      orderId: orderThree.id,
      type: WalletTransactionType.ORDER_REVERSAL,
      direction: WalletTransactionDirection.DEBIT,
      amount: dec(147000),
      title: `برگشت مالی سفارش #${orderThree.id}`,
      description: 'بخشی از سهم فروشنده reverse شد',
      metadata: { stage: 'available-reversal' } as Prisma.InputJsonValue,
    },
    {
      walletId: walletTwo.id,
      storeId: input.stores.storeTwo.id,
      type: WalletTransactionType.MANUAL_CREDIT,
      direction: WalletTransactionDirection.CREDIT,
      amount: dec(647000),
      title: 'شارژ تستی کیف پول',
      description: 'اعتبار اولیه برای سناریوهای تست',
    },
  ]);

  await upsertReviewForOrder(orderOne.id, {
    userId: input.users.customerOne.id,
    productId: input.products.productOne.id,
    rating: 5,
    comment: 'سفارش سالم و با کيفيت تحويل شد',
  });

  await upsertDomainEventBySignature('سفارش اول ایجاد شد', {
    eventType: DomainEventType.ORDER_CREATED,
    aggregateType: 'order',
    aggregateId: orderOne.id,
    actorUserId: input.users.customerOne.id,
    storeId: input.stores.storeOne.id,
    orderId: orderOne.id,
    summary: 'سفارش اول ایجاد شد',
    payload: { paymentMethod: PaymentMethod.COD } as Prisma.InputJsonValue,
    status: DomainEventStatus.PENDING,
  });
  await upsertDomainEventBySignature('سفارش اول تحویل شد', {
    eventType: DomainEventType.ORDER_DELIVERED,
    aggregateType: 'order',
    aggregateId: orderOne.id,
    actorUserId: input.users.vendorOne.id,
    storeId: input.stores.storeOne.id,
    orderId: orderOne.id,
    summary: 'سفارش اول تحویل شد',
    payload: { status: OrderStatus.DELIVERED } as Prisma.InputJsonValue,
    status: DomainEventStatus.PROCESSED,
    processedAt: hoursAgo(20),
  });
  await upsertDomainEventBySignature('درآمد سفارش اول hold شد', {
    eventType: DomainEventType.SETTLEMENT_HELD,
    aggregateType: 'order',
    aggregateId: orderOne.id,
    storeId: input.stores.storeOne.id,
    orderId: orderOne.id,
    walletId: walletOne.id,
    summary: 'درآمد سفارش اول hold شد',
    payload: { amount: 768200 } as Prisma.InputJsonValue,
    status: DomainEventStatus.PROCESSED,
    processedAt: hoursAgo(19),
  });
  await upsertDomainEventBySignature('پرداخت سفارش دوم شروع شد', {
    eventType: DomainEventType.PAYMENT_INITIATED,
    aggregateType: 'payment',
    aggregateId: orderTwo.id,
    actorUserId: input.users.customerTwo.id,
    storeId: input.stores.storeOne.id,
    orderId: orderTwo.id,
    paymentId: paymentTwo.id,
    summary: 'پرداخت سفارش دوم شروع شد',
    payload: { gatewayKey: 'mock-default' } as Prisma.InputJsonValue,
    status: DomainEventStatus.PROCESSED,
    processedAt: hoursAgo(13),
  });
  await upsertDomainEventBySignature('پرداخت سفارش دوم موفق شد', {
    eventType: DomainEventType.PAYMENT_SUCCEEDED,
    aggregateType: 'payment',
    aggregateId: orderTwo.id,
    actorUserId: input.users.customerTwo.id,
    storeId: input.stores.storeOne.id,
    orderId: orderTwo.id,
    paymentId: paymentTwo.id,
    summary: 'پرداخت سفارش دوم موفق شد',
    payload: { refId: 'REF-ORDER-2' } as Prisma.InputJsonValue,
    status: DomainEventStatus.PROCESSED,
    processedAt: paidAt,
  });
  await upsertDomainEventBySignature('تیکت پشتیبانی ثبت شد', {
    eventType: DomainEventType.SUPPORT_TICKET_CREATED,
    aggregateType: 'support-ticket',
    aggregateId: ticket.id,
    actorUserId: input.users.customerOne.id,
    storeId: input.stores.storeOne.id,
    orderId: orderOne.id,
    supportTicketId: ticket.id,
    summary: 'تیکت پشتیبانی ثبت شد',
    payload: { reason: SupportTicketReason.DAMAGED_FLOWERS } as Prisma.InputJsonValue,
    status: DomainEventStatus.PENDING,
  });
  await upsertDomainEventBySignature('تصمیم مالی روی تیکت ثبت شد', {
    eventType: DomainEventType.SUPPORT_FINANCE_DECISION_APPLIED,
    aggregateType: 'support-ticket',
    aggregateId: ticket.id,
    actorUserId: input.users.admin.id,
    storeId: input.stores.storeOne.id,
    orderId: orderOne.id,
    supportTicketId: ticket.id,
    summary: 'تصمیم مالی روی تیکت ثبت شد',
    payload: { outcome: SupportTicketFinanceOutcome.PARTIAL_REFUND, amount: 150000 } as Prisma.InputJsonValue,
    status: DomainEventStatus.PROCESSED,
    processedAt: hoursAgo(15),
  });
  await upsertDomainEventBySignature('کیف پول فروشگاه دوم تنظیم شد', {
    eventType: DomainEventType.WALLET_ADJUSTED,
    aggregateType: 'wallet',
    aggregateId: walletTwo.id,
    actorUserId: input.users.admin.id,
    storeId: input.stores.storeTwo.id,
    walletId: walletTwo.id,
    summary: 'کیف پول فروشگاه دوم تنظیم شد',
    payload: { amount: 647000, direction: WalletTransactionDirection.CREDIT } as Prisma.InputJsonValue,
    status: DomainEventStatus.PROCESSED,
    processedAt: hoursAgo(14),
  });
}

async function main() {
  console.log('🌱 Starting rich demo seed...');

  await upsertPermissions();
  const roleIds = await upsertRoles();
  await syncDefaultRolePermissions(roleIds);
  const gateway = await ensureDefaultPaymentGatewayConfig();
  const users = await ensureUsers(roleIds);
  await seedAddresses(users);
  const catalog = await seedCatalogAndStores(users);
  const financeSetup = await seedPricingAndPolicies(
    users.admin.id,
    catalog.stores,
    catalog.products,
    catalog.categories,
  );
  await seedCarts(users, catalog.products);
  await seedOrdersAndOperations({
    users,
    stores: catalog.stores,
    products: catalog.products,
    paymentGatewayConfigId: gateway.id,
    commissionRuleId: financeSetup.globalRule.id,
    couponId: financeSetup.coupon.id,
  });

  console.log('✅ Demo seed completed successfully.');
  console.log('Demo users:');
  console.log('- ADMIN: 09120000000');
  console.log('- VENDOR: 09121111111 / 09122222222');
  console.log('- CUSTOMER: 09123333333 / 09124444444 / 09125555555');
}

main()
  .catch((error) => {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
