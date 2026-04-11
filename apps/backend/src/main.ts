import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  process.env.MY_NEW_DB_URL = "postgresql://postgres:5DZ1XlLTSbapKIIdxKEnLHqCsfjzvVQ8GDRqcGoXtAXB7iPNIelkmoLefFzH5DZF@185.80.196.10:5433/postgres?sslmode=disable";
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
