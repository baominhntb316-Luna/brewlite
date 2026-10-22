import * as dotenv from 'dotenv';
import * as path from 'path';

// Nạp các biến môi trường từ file .env gốc của dự án CNPM
const rootEnvCandidates = [
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(process.cwd(), '.env'),
];
for (const envPath of rootEnvCandidates) {
  dotenv.config({ path: envPath });
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`🚀 API đang chạy tại: http://localhost:${port}`);
  logger.log(`📦 Database: ${process.env.DATABASE_URL ? 'Đã nạp thành công từ .env gốc' : 'Chưa cấu hình DATABASE_URL'}`);
}
bootstrap();