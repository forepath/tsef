import { resolveInstanceId, resolveServiceRole } from './instance-id.utils';

describe('instance-id.utils', () => {
  it('resolveInstanceId prefers INSTANCE_ID env', () => {
    expect(
      resolveInstanceId({
        serviceName: 'billing-manager',
        role: 'api',
        env: { INSTANCE_ID: 'instance-123' },
      }),
    ).toBe('instance-123');
  });

  it('resolveInstanceId falls back to deterministic service:role:hostname', () => {
    expect(
      resolveInstanceId({
        serviceName: 'billing-manager',
        role: 'worker',
        hostname: 'host-a',
      }),
    ).toBe('billing-manager:worker:host-a');
  });

  it('resolveServiceRole prefers override then QUEUE_ROLE then AGENT_MANAGER_ROLE', () => {
    expect(resolveServiceRole({ QUEUE_ROLE: 'worker' })).toBe('worker');
    expect(resolveServiceRole({ AGENT_MANAGER_ROLE: 'scheduler' })).toBe('scheduler');
    expect(resolveServiceRole({}, () => 'custom')).toBe('custom');
    expect(resolveServiceRole({})).toBe('api');
  });
});
