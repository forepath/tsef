import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { readRedisConnectionConfig } from '@forepath/shared/backend/util-queue';

import {
  buildUpdatesCheckJobKey,
  buildUpdatesInstanceKey,
  buildUpdatesInstanceScanPattern,
  buildUpdatesReleaseKey,
  INSTANCE_HEARTBEAT_TTL_SECONDS,
} from '../constants/updates.constants';
import type { ReleaseSnapshot, ServiceInstanceRecord, UpdateCheckJobMeta } from '../interfaces/updates.interfaces';

@Injectable()
export class UpdatesRedisStore implements OnModuleDestroy {
  private readonly logger = new Logger(UpdatesRedisStore.name);
  private client: Redis | null = null;
  private connectPromise: Promise<void> | null = null;
  private readonly keyPrefix: string;

  constructor() {
    this.keyPrefix = readRedisConnectionConfig().keyPrefix;
  }

  private isEnabled(): boolean {
    return process.env['REDIS_CACHE_ENABLED']?.trim().toLowerCase() !== 'false';
  }

  private releaseKey(): string {
    return buildUpdatesReleaseKey(this.keyPrefix);
  }

  private instanceKey(instanceId: string): string {
    return buildUpdatesInstanceKey(this.keyPrefix, instanceId);
  }

  private checkJobKey(): string {
    return buildUpdatesCheckJobKey(this.keyPrefix);
  }

  private async ensureConnected(): Promise<Redis | null> {
    if (!this.isEnabled()) {
      return null;
    }

    if (!this.client) {
      const config = readRedisConnectionConfig();

      this.client = new Redis({
        host: config.host,
        port: config.port,
        db: config.db,
        ...(config.password ? { password: config.password } : {}),
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      });
    }

    if (!this.connectPromise) {
      this.connectPromise = this.client
        .connect()
        .then(() => undefined)
        .catch((error: Error) => {
          this.connectPromise = null;
          throw error;
        });
    }

    try {
      await this.connectPromise;
    } catch (error) {
      this.logger.warn(`Updates Redis connection failed: ${(error as Error).message}`);

      return null;
    }

    return this.client;
  }

  async ping(): Promise<boolean> {
    const client = await this.ensureConnected();

    if (!client) {
      return false;
    }

    try {
      const response = await client.ping();

      return response === 'PONG';
    } catch (error) {
      this.logger.warn(`Updates Redis ping failed: ${(error as Error).message}`);

      return false;
    }
  }

  async getRelease(): Promise<ReleaseSnapshot | null> {
    const client = await this.ensureConnected();

    if (!client) {
      return null;
    }

    try {
      const raw = await client.get(this.releaseKey());

      if (!raw) {
        return null;
      }

      return JSON.parse(raw) as ReleaseSnapshot;
    } catch (error) {
      this.logger.warn(`Updates Redis getRelease failed: ${(error as Error).message}`);

      return null;
    }
  }

  async setRelease(release: ReleaseSnapshot): Promise<void> {
    const client = await this.ensureConnected();

    if (!client) {
      return;
    }

    try {
      await client.set(this.releaseKey(), JSON.stringify(release));
    } catch (error) {
      this.logger.warn(`Updates Redis setRelease failed: ${(error as Error).message}`);
    }
  }

  async listInstances(): Promise<ServiceInstanceRecord[]> {
    const client = await this.ensureConnected();

    if (!client) {
      return [];
    }

    const instances: ServiceInstanceRecord[] = [];
    let cursor = '0';

    try {
      do {
        const [nextCursor, keys] = await client.scan(
          cursor,
          'MATCH',
          buildUpdatesInstanceScanPattern(this.keyPrefix),
          'COUNT',
          100,
        );
        cursor = nextCursor;

        if (keys.length === 0) {
          continue;
        }

        const values = await client.mget(...keys);

        for (const raw of values) {
          if (!raw) {
            continue;
          }

          instances.push(JSON.parse(raw) as ServiceInstanceRecord);
        }
      } while (cursor !== '0');
    } catch (error) {
      this.logger.warn(`Updates Redis listInstances failed: ${(error as Error).message}`);

      return [];
    }

    return instances;
  }

  async getInstance(instanceId: string): Promise<ServiceInstanceRecord | null> {
    const client = await this.ensureConnected();

    if (!client) {
      return null;
    }

    try {
      const raw = await client.get(this.instanceKey(instanceId));

      if (!raw) {
        return null;
      }

      return JSON.parse(raw) as ServiceInstanceRecord;
    } catch (error) {
      this.logger.warn(`Updates Redis getInstance failed: ${(error as Error).message}`);

      return null;
    }
  }

  async upsertInstance(instance: ServiceInstanceRecord): Promise<void> {
    const client = await this.ensureConnected();

    if (!client) {
      return;
    }

    try {
      await client.set(
        this.instanceKey(instance.instanceId),
        JSON.stringify(instance),
        'EX',
        INSTANCE_HEARTBEAT_TTL_SECONDS,
      );
    } catch (error) {
      this.logger.warn(`Updates Redis upsertInstance failed: ${(error as Error).message}`);
    }
  }

  async setCheckJobMeta(meta: UpdateCheckJobMeta): Promise<void> {
    const client = await this.ensureConnected();

    if (!client) {
      return;
    }

    try {
      await client.set(this.checkJobKey(), JSON.stringify(meta));
    } catch (error) {
      this.logger.warn(`Updates Redis setCheckJobMeta failed: ${(error as Error).message}`);
    }
  }

  async getCheckJobMeta(): Promise<UpdateCheckJobMeta | null> {
    const client = await this.ensureConnected();

    if (!client) {
      return null;
    }

    try {
      const raw = await client.get(this.checkJobKey());

      if (!raw) {
        return null;
      }

      return JSON.parse(raw) as UpdateCheckJobMeta;
    } catch (error) {
      this.logger.warn(`Updates Redis getCheckJobMeta failed: ${(error as Error).message}`);

      return null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      await this.client.quit();
    } catch (error) {
      this.logger.warn(`Updates Redis disconnect failed: ${(error as Error).message}`);
    } finally {
      this.client = null;
      this.connectPromise = null;
    }
  }
}
