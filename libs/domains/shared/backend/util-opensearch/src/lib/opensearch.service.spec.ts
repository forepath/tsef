import { OpenSearchService } from './opensearch.service';

describe('OpenSearchService', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('isEnabled_FalseWhenDisabled', () => {
    process.env['OPENSEARCH_ENABLED'] = 'false';
    const service = new OpenSearchService();

    expect(service.isEnabled()).toBe(false);
  });

  it('indexName_UsesConfiguredPrefix', () => {
    process.env['OPENSEARCH_INDEX_PREFIX'] = 'decabill';
    const service = new OpenSearchService();

    expect(service.indexName('subscriptions')).toBe('decabill-subscriptions');
  });

  it('ping_ReturnsFalseWhenDisabled', async () => {
    process.env['OPENSEARCH_ENABLED'] = 'false';
    const service = new OpenSearchService();

    await expect(service.ping()).resolves.toBe(false);
  });
});
