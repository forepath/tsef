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

  // Configure CORS
  // In production: CORS is restricted by default (requires CORS_ORIGIN to be set)
  // In development: CORS allows all origins by default (can be restricted via CORS_ORIGIN)
  const isProduction = process.env.NODE_ENV === 'production';
  const corsOrigin = process.env.CORS_ORIGIN;

  let origin: string | string[];
  if (corsOrigin) {
    // If CORS_ORIGIN is explicitly set, use it (comma-separated list)
    origin = corsOrigin.split(',').map((o) => o.trim());
  } else if (isProduction) {
    // In production, if CORS_ORIGIN is not set, default to empty array (no CORS)
    // This is the most secure default for production
    origin = [];
    Logger.warn(
      '⚠️  CORS_ORIGIN not set in production - CORS is disabled. Set CORS_ORIGIN environment variable to allow specific origins.',
    );
  } else {
    // In development, allow all origins by default
    origin = '*';
  }

  app.enableCors({
    origin,
    // credentials can only be true when origin is not '*'
    credentials: origin !== '*' && Array.isArray(origin) && origin.length > 0,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
  });

  if (Array.isArray(origin) && origin.length > 0) {
    Logger.log(`🌐 CORS enabled with restricted origins: ${origin.join(', ')}`);
  } else if (origin === '*') {
    Logger.log('🌐 CORS enabled with origin: * (all origins allowed - development mode)');
  } else {
    Logger.log('🌐 CORS disabled (no origins allowed)');
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
  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port);
  Logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix}`);
  Logger.log(
    `🔌 Socket.IO WebSocket gateway is running on: http://localhost:${process.env.WEBSOCKET_PORT || '8080'}/agents`,
  );
}

bootstrap();
