/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { DataSource } from 'typeorm';
import { AppModule } from './app/app.module';
import { typeormConfig } from './typeorm.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure CORS (enabled by default with origin: '*', configurable via ENABLE_CORS and CORS_ORIGIN)
  const enableCors = process.env.ENABLE_CORS === 'true';
  const corsOrigin = enableCors ? process.env.CORS_ORIGIN || '*' : '*';
  const origin = corsOrigin === '*' ? '*' : corsOrigin.split(',').map((o) => o.trim());

  app.enableCors({
    origin,
    // credentials can only be true when origin is not '*'
    credentials: origin !== '*',
  });

  if (enableCors && corsOrigin !== '*') {
    Logger.log(`🌐 CORS enabled with restricted origin: ${corsOrigin}`);
  } else {
    Logger.log('🌐 CORS enabled with origin: * (all origins allowed)');
  }

  // Configure WebSocket adapter for Socket.IO
  app.useWebSocketAdapter(new IoAdapter(app));

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
  const port = process.env.PORT || 3100;
  await app.listen(port);
  Logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
