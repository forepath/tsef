import {
  assertKeepalivedActiveOnAllNodes,
  assertSingleVipHolder,
  inspectVipFromOutputs,
} from './vip-inspection.service';

describe('vip inspection', () => {
  it('identifies a single VIP holder', () => {
    const inspection = inspectVipFromOutputs('203.0.113.10/32', [
      { nodeId: 'node-a1', output: 'inet 203.0.113.10/32 scope global eth0\nactive' },
      { nodeId: 'node-a2', output: 'active' },
    ]);

    expect(inspection.holderNodeId).toBe('node-a1');
    expect(inspection.holderCount).toBe(1);
    assertSingleVipHolder(inspection);
    assertKeepalivedActiveOnAllNodes(inspection);
  });

  it('identifies holders for multiple VIP addresses', () => {
    const inspection = inspectVipFromOutputs(
      ['203.0.113.10/32', '203.0.113.11/32'],
      [
        { nodeId: 'node-a1', output: 'inet 203.0.113.10/32 scope global eth0\nactive' },
        { nodeId: 'node-a2', output: 'inet 203.0.113.11/32 scope global eth0\nactive' },
      ],
    );

    expect(inspection.addresses).toEqual([
      { address: '203.0.113.10/32', holderNodeId: 'node-a1', holderCount: 1 },
      { address: '203.0.113.11/32', holderNodeId: 'node-a2', holderCount: 1 },
    ]);
    assertSingleVipHolder(inspection, '203.0.113.11/32');
  });

  it('rejects split-brain VIP assignment', () => {
    const inspection = inspectVipFromOutputs('203.0.113.10/32', [
      { nodeId: 'node-a1', output: '203.0.113.10/32 active' },
      { nodeId: 'node-a2', output: '203.0.113.10/32 active' },
    ]);

    expect(() => assertSingleVipHolder(inspection)).toThrow(/multiple nodes/);
  });
});
