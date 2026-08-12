import { formatProvisioningLocationLabel, providerLocationCatalogFromList } from './provisioning-geography.utils';

describe('provisioning geography utils', () => {
  it('should format label from catalog map', () => {
    const catalog = providerLocationCatalogFromList([{ id: 'fsn1', name: 'Falkenstein' }]);

    expect(formatProvisioningLocationLabel('fsn1', catalog)).toBe('Falkenstein');
  });

  it('should format label from static provider fallbacks', () => {
    expect(formatProvisioningLocationLabel('fsn1', undefined, 'hetzner')).toBe('Falkenstein');
    expect(formatProvisioningLocationLabel('fra1', undefined, 'digital-ocean')).toBe('Frankfurt 1');
  });

  it('should fall back to slug when catalog and provider miss entry', () => {
    expect(formatProvisioningLocationLabel('unknown', [])).toBe('unknown');
  });
});
