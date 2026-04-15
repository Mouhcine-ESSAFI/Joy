import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { DataSource } from 'typeorm';
import { createOwnerUser } from './create-owner.seed';
import { createStores } from './create-stores.seed';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const dataSource = app.get(DataSource);

  console.log('🌱 Running database seeds...');

  try {
    await createOwnerUser(dataSource);
    await createStores(dataSource);
    console.log('✅ All seeds completed successfully');
  } catch (error) {
    console.error('❌ Seed failed:', error);
  } finally {
    await app.close();
  }
}

bootstrap();