import { isOtelEffectivelyEnabled, resolveOtelRuntimeConfig, setGauge } from '@forepath/shared/backend/util-otel';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AgentMessageEntity } from '../entities/agent-message.entity';
import { RegexFilterRuleEntity } from '../entities/regex-filter-rule.entity';

const METER_NAME = 'forepath.agenstra';
const POLL_INTERVAL_MS = 60_000;

@Injectable()
export class AgenstraManagerMetricsCollectorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AgenstraManagerMetricsCollectorService.name);
  private intervalHandle: NodeJS.Timeout | undefined;

  constructor(
    @InjectRepository(AgentMessageEntity)
    private readonly messageRepository: Repository<AgentMessageEntity>,
    @InjectRepository(RegexFilterRuleEntity)
    private readonly filterRulesRepository: Repository<RegexFilterRuleEntity>,
  ) {}

  onModuleInit(): void {
    const config = resolveOtelRuntimeConfig(process.env, 'agenstra-agent-manager');

    if (!isOtelEffectivelyEnabled(config)) {
      return;
    }

    void this.collectMetrics();
    this.intervalHandle = setInterval(() => {
      void this.collectMetrics();
    }, POLL_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = undefined;
    }
  }

  private async collectMetrics(): Promise<void> {
    try {
      const messageRows = await this.messageRepository
        .createQueryBuilder('message')
        .select('message.actor', 'actor')
        .addSelect('message.filtered', 'filtered')
        .addSelect('COUNT(*)', 'count')
        .groupBy('message.actor')
        .addGroupBy('message.filtered')
        .getRawMany<{ actor: string; filtered: boolean | string; count: string }>();

      for (const row of messageRows) {
        const filtered = row.filtered === true || row.filtered === 'true' || row.filtered === '1';

        setGauge(METER_NAME, 'agenstra.manager.chat_messages', parseInt(row.count ?? '0', 10), {
          actor: row.actor,
          filtered: filtered ? 'true' : 'false',
        });
      }

      const filterRuleRows = await this.filterRulesRepository
        .createQueryBuilder('rule')
        .select('rule.direction', 'direction')
        .addSelect('rule.filter_type', 'filterType')
        .addSelect('COUNT(*)', 'count')
        .groupBy('rule.direction')
        .addGroupBy('rule.filter_type')
        .getRawMany<{ direction: string; filterType: string; count: string }>();

      for (const row of filterRuleRows) {
        setGauge(METER_NAME, 'agenstra.manager.filter_rules', parseInt(row.count ?? '0', 10), {
          direction: row.direction,
          filter_type: row.filterType,
        });
      }
    } catch (error) {
      this.logger.warn(`Failed to collect Agenstra manager OTEL metrics: ${(error as Error).message}`);
    }
  }
}
