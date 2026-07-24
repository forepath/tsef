import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { getGeneratorSchema, listGenerators, resolveCodePackageRoot, resolveWorkspaceRoot } from './generators-meta';

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

  it('lists generators by resolving the package root from this module', () => {
    const list = listGenerators();
    expect(list.some((g) => g.name === 'backend')).toBe(true);
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

  it('falls back to generator name when description is missing', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'code-gens-'));
    try {
      fs.writeFileSync(
        path.join(tmp, 'generators.json'),
        JSON.stringify({
          generators: {
            bare: { factory: './x', schema: './schema.json' },
          },
        }),
        'utf8',
      );
      fs.writeFileSync(path.join(tmp, 'schema.json'), JSON.stringify({ type: 'object' }), 'utf8');

      const list = listGenerators(tmp);
      expect(list).toEqual([expect.objectContaining({ name: 'bare', description: 'bare', factory: './x' })]);
      expect(getGeneratorSchema('bare', tmp).description).toBe('bare');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('throws when schema file is missing', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'code-gens-missing-schema-'));
    try {
      fs.writeFileSync(
        path.join(tmp, 'generators.json'),
        JSON.stringify({
          generators: {
            broken: { factory: './x', schema: './missing-schema.json', description: 'Broken' },
          },
        }),
        'utf8',
      );

      expect(() => getGeneratorSchema('broken', tmp)).toThrow(/Schema file not found/);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('resolveCodePackageRoot walks parents and errors when missing', () => {
    const nested = path.join(packageRoot, 'src', 'lib', 'mcp');
    expect(resolveCodePackageRoot(nested)).toBe(packageRoot);

    const orphan = fs.mkdtempSync(path.join(os.tmpdir(), 'code-pkg-orphan-'));
    try {
      expect(() => resolveCodePackageRoot(orphan)).toThrow(/Unable to locate @forepath\/code package root/);
    } finally {
      fs.rmSync(orphan, { recursive: true, force: true });
    }
  });

  it('resolveCodePackageRoot handles a code/ dir with project.json while searching', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'code-pkg-walk-'));
    try {
      const codeDir = path.join(tmp, 'code');
      const nested = path.join(codeDir, 'src', 'lib');
      fs.mkdirSync(nested, { recursive: true });
      fs.writeFileSync(path.join(codeDir, 'project.json'), JSON.stringify({ name: 'code' }), 'utf8');
      // No generators.json under code/ — walk continues to tmp and fails.
      expect(() => resolveCodePackageRoot(nested)).toThrow(/Unable to locate @forepath\/code package root/);

      // Force the project.json branch return by making generators.json appear only on the second check.
      const realExistsSync = fs.existsSync;
      const targetGenerators = path.resolve(path.join(codeDir, 'generators.json'));
      let generatorsChecks = 0;
      const existsSync = jest.spyOn(fs, 'existsSync').mockImplementation((p) => {
        if (path.resolve(String(p)) === targetGenerators) {
          generatorsChecks += 1;
          return generatorsChecks >= 2;
        }
        return realExistsSync(p);
      });

      try {
        expect(resolveCodePackageRoot(nested)).toBe(codeDir);
      } finally {
        existsSync.mockRestore();
      }
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('resolveWorkspaceRoot finds nx.json or falls back to startDir', () => {
    const nested = path.join(packageRoot, 'src', 'lib', 'mcp');
    const workspace = resolveWorkspaceRoot(nested);
    expect(fs.existsSync(path.join(workspace, 'nx.json'))).toBe(true);

    const orphan = fs.mkdtempSync(path.join(os.tmpdir(), 'code-ws-orphan-'));
    try {
      expect(resolveWorkspaceRoot(orphan)).toBe(path.resolve(orphan));
    } finally {
      fs.rmSync(orphan, { recursive: true, force: true });
    }
  });
});
