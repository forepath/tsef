import { deepMerge } from './deep-merge';

describe('deepMerge', () => {
  it('merges nested objects with overlay winning', () => {
    const result = deepMerge(
      { vip: { address: '10.0.0.1', interface: 'eth0', authPass: 'filepass' }, cluster: { name: 'a' } },
      { vip: { authPass: 'envpass' } },
    );

    expect(result).toEqual({
      vip: { address: '10.0.0.1', interface: 'eth0', authPass: 'envpass' },
      cluster: { name: 'a' },
    });
  });

  it('replaces arrays instead of concatenating', () => {
    expect(deepMerge({ volumes: ['a', 'b'] }, { volumes: ['c'] })).toEqual({ volumes: ['c'] });
  });

  it('skips undefined overlay values', () => {
    expect(deepMerge({ a: 1, b: 2 }, { a: undefined, b: 3 })).toEqual({ a: 1, b: 3 });
  });
});
