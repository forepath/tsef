/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from './app/app.module';
import { typeormConfig } from './typeorm.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Run migrations automatically on startup if synchronize is disabled
  // Note: If synchronize: true, schema is auto-synced from entities and migrations won't run
  // To use migrations, set synchronize: false in typeorm.config.ts
  if (!typeormConfig.synchronize && typeormConfig.migrations?.length) {
    const dataSource = app.get(DataSource);
    try {
      Logger.log('🔄 Running pending migrations...');
      await dataSource.runMigrations();
      Logger.log('✅ Migrations completed successfully');
    } catch (error) {
      Logger.error('❌ Failed to run migrations:', error);
      throw error;
    }
  } else if (typeormConfig.synchronize) {
    Logger.log('ℹ️  Schema synchronization enabled - migrations skipped');
  }

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
