const setGauge = jest.fn();
const isOtelEffectivelyEnabled = jest.fn(() => true);
const resolveOtelRuntimeConfig = jest.fn(() => ({ enabled: true }));

jest.mock('@forepath/shared/backend/util-otel', () => ({
  isOtelEffectivelyEnabled,
  resolveOtelRuntimeConfig,
  setGauge,
}));

import { AgenstraManagerMetricsCollectorService } from './agenstra-manager-metrics-collector.service';

describe('AgenstraManagerMetricsCollectorService', () => {
  const messageCreateQueryBuilder = jest.fn();
  const filterCreateQueryBuilder = jest.fn();
  const messageRepository = {
    createQueryBuilder: messageCreateQueryBuilder,
  };
  const filterRulesRepository = {
    createQueryBuilder: filterCreateQueryBuilder,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    isOtelEffectivelyEnabled.mockReturnValue(true);
    resolveOtelRuntimeConfig.mockReturnValue({ enabled: true });
  });

  it('sets chat message and filter rule gauges when OTEL is enabled', async () => {
    messageCreateQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        { actor: 'user', filtered: false, count: '10' },
        { actor: 'agent', filtered: true, count: '2' },
      ]),
    });
    filterCreateQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([{ direction: 'incoming', filterType: 'drop', count: '3' }]),
    });

    const service = new AgenstraManagerMetricsCollectorService(
      messageRepository as never,
      filterRulesRepository as never,
    );

    await (service as unknown as { collectMetrics: () => Promise<void> }).collectMetrics();

    expect(setGauge).toHaveBeenCalledWith('forepath.agenstra', 'agenstra.manager.chat_messages', 10, {
      actor: 'user',
      filtered: 'false',
    });
    expect(setGauge).toHaveBeenCalledWith('forepath.agenstra', 'agenstra.manager.chat_messages', 2, {
      actor: 'agent',
      filtered: 'true',
    });
    expect(setGauge).toHaveBeenCalledWith('forepath.agenstra', 'agenstra.manager.filter_rules', 3, {
      direction: 'incoming',
      filter_type: 'drop',
    });
  });
});
