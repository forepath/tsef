import { loadweaverConfigSchema } from './schema';

describe('loadweaverConfigSchema', () => {
  it('accepts a valid multi-site configuration', () => {
    const config = loadweaverConfigSchema.parse({
      version: 1,
      profile: 'prod',
      cluster: { name: 'loadweaver-prod', primaryManager: 'node-a1' },
      sites: [{ name: 'site-a', nodes: ['node-a1'] }],
      nodes: {
        'node-a1': {
          hostname: 'a1.example.com',
          wireguardIp: '10.200.0.1',
          roles: ['manager', 'ceph-mon', 'ceph-mds', 'ceph-osd'],
        },
        'node-a2': {
          hostname: 'a2.example.com',
          wireguardIp: '10.200.0.2',
          roles: ['manager', 'ceph-mon', 'ceph-osd'],
        },
        'node-a3': {
          hostname: 'a3.example.com',
          wireguardIp: '10.200.0.3',
          roles: ['manager', 'ceph-osd'],
        },
      },
    });

    expect(config.cluster.name).toBe('loadweaver-prod');
  });

  it('defaults wireguard key rotation policy', () => {
    const config = loadweaverConfigSchema.parse({
      version: 1,
      cluster: { name: 'x', primaryManager: 'node-a1' },
      nodes: {
        'node-a1': {
          hostname: 'a1.example.com',
          wireguardIp: '10.200.0.1',
          roles: ['manager'],
        },
      },
    });

    expect(config.wireguard.keyRotation).toEqual({
      enabled: false,
      intervalDays: 90,
      warnBeforeDays: 14,
    });
  });

  it('rejects unknown site node references', () => {
    expect(() =>
      loadweaverConfigSchema.parse({
        version: 1,
        cluster: { name: 'x', primaryManager: 'node-a1' },
        sites: [{ name: 'site-a', nodes: ['missing-node'] }],
        nodes: {
          'node-a1': {
            hostname: 'a1.example.com',
            wireguardIp: '10.200.0.1',
            roles: ['manager'],
          },
        },
      }),
    ).toThrow();
  });

  it('accepts vip pools with node host and swarm backends', () => {
    const config = loadweaverConfigSchema.parse({
      version: 1,
      cluster: { name: 'x', primaryManager: 'node-a1' },
      nodes: {
        'node-a1': {
          hostname: 'a1.example.com',
          wireguardIp: '10.200.0.1',
          roles: ['manager'],
        },
      },
      vip: {
        address: '203.0.113.100',
        interface: 'eth0',
        pools: [
          {
            name: 'postgres',
            address: '203.0.113.101',
            listeners: [
              {
                port: 5432,
                backends: [
                  { type: 'node', nodeId: 'node-a1', port: 5432 },
                  { type: 'host', host: '10.200.0.50', port: 5432 },
                  { type: 'swarm', service: 'postgres', port: 5432 },
                ],
              },
            ],
          },
        ],
      },
    });

    expect(config.vip?.pools).toHaveLength(1);
    expect(config.vip?.pools?.[0].listeners[0].backends).toHaveLength(3);
  });

  it('rejects vip without address or pools', () => {
    expect(() =>
      loadweaverConfigSchema.parse({
        version: 1,
        cluster: { name: 'x', primaryManager: 'node-a1' },
        nodes: {
          'node-a1': {
            hostname: 'a1.example.com',
            wireguardIp: '10.200.0.1',
            roles: ['manager'],
          },
        },
        vip: { interface: 'eth0' },
      }),
    ).toThrow(/address and\/or at least one pool/);
  });

  it('rejects duplicate vip pool addresses', () => {
    expect(() =>
      loadweaverConfigSchema.parse({
        version: 1,
        cluster: { name: 'x', primaryManager: 'node-a1' },
        nodes: {
          'node-a1': {
            hostname: 'a1.example.com',
            wireguardIp: '10.200.0.1',
            roles: ['manager'],
          },
        },
        vip: {
          address: '203.0.113.100',
          interface: 'eth0',
          pools: [{ name: 'postgres', address: '203.0.113.100', listeners: [] }],
        },
      }),
    ).toThrow(/Duplicate vip address/);
  });
});
