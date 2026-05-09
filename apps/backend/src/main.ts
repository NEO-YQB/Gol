import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';


async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // سطح لاگ‌ها طبق توافق قبلی برای خلوت ماندن کنسول
    logger: ['error', 'warn'],
  });

  const allowedOrigins = (
    process.env.CORS_ORIGINS ??
    'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:3001,http://127.0.0.1:3001'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} is not allowed by CORS`), false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ۱. تنظیم پیشوند نسخه (باید قبل از Swagger باشد)
  app.setGlobalPrefix('v1');

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });


  // ۲. تنظیم لوله اعتبار‌سنجی (ValidationPipe)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // حذف فیلدهای ناخواسته
      forbidNonWhitelisted: true, // خطا در صورت وجود فیلد اضافی
      transform: true, // تبدیل خودکار تایپ‌ها (مثلا String به Number)
      transformOptions: {
        enableImplicitConversion: true, // تبدیل هوشمند بر اساس تایپ‌های DTO
      },
    }),
  );

  // ۳. پیکربندی مستندات Swagger
  const config = new DocumentBuilder()
    .setTitle('MasterDebug API')
    .setDescription('مستندات API پنل مدیریت محصولات و کاتالوگ مرکزی')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'توکن JWT خود را اینجا وارد کنید',
        in: 'header',
      },
      'JWT-auth', // این کلید برای استفاده در دکوراتور @ApiBearerAuth('JWT-auth') است
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  // تنظیم آدرس مستندات (مثال: http://localhost:3000/api/docs)
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // جلوگیری از پریدن توکن با رفرش صفحه
      filter: true, // اضافه کردن باکس جستجو در مستندات
    },
  });

  // ۴. اجرای اپلیکیشن روی پورت ۳۰۰۰ یا پورت تنظیم شده در سرور
  const PORT = process.env.PORT || 3000;
  await app.listen(PORT);

  // نمایش لینک‌های دسترسی در کنسول
  console.log(`\n✅ Application is running on: http://localhost:${PORT}/v1`);
  console.log(`📝 Swagger docs available at: http://localhost:${PORT}/api/docs\n`);
}

bootstrap();
