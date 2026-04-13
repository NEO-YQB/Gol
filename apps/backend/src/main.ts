import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common'; // این را اضافه کنید

async function bootstrap() {
  const app = await NestFactory.create(AppModule,{
    logger: ['error', 'warn'],
  });
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true, 
    },
  }));

  app.setGlobalPrefix('v1');
  await app.listen(3000);
  console.log(`🚀 Application is running`);
}
bootstrap();
