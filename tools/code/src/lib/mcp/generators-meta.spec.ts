import * as path from 'path';

import { getGeneratorSchema, listGenerators, resolveCodePackageRoot } from './generators-meta';

describe('code mcp generators-meta', () => {
  const packageRoot = resolveCodePackageRoot(path.join(__dirname));

  it('lists generators from generators.json', () => {
    const list = listGenerators(packageRoot);
    const names = list.map((g) => g.name);
    expect(names).toEqual(
      expect.arrayContaining(['backend', 'frontend', 'lib', 'domain', 'mcp', 'native', 'keycloak-theme', 'init']),
    );
    expect(list.every((g) => typeof g.description === 'string' && g.description.length > 0)).toBe(true);
  });

  it('loads backend schema', () => {
    const result = getGeneratorSchema('backend', packageRoot);
    expect(result.name).toBe('backend');
    expect(result.schema).toEqual(
      expect.objectContaining({
        type: 'object',
        required: expect.arrayContaining(['name']),
      }),
    );
  });

  it('throws on unknown generator', () => {
    expect(() => getGeneratorSchema('not-a-real-generator', packageRoot)).toThrow(/Unknown generator/);
  });
});
