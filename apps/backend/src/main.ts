import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common'; // این را اضافه کنید

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // این خط را اضافه کنید تا اعتبارسنجی فعال شود
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // فیلدهای اضافی که در DTO نیستند را حذف می‌کند
    forbidNonWhitelisted: true, // اگر فیلد اضافی فرستاده شود خطا می‌دهد
    transform: true, // به صورت خودکار تایپ‌ها را تبدیل می‌کند
  }));

  app.setGlobalPrefix('v1');
  await app.listen(3000);
}
bootstrap();
