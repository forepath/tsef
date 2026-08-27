import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { z } from 'zod';

import { loadConfigFile, parseConfigContent, writeTemplate } from './config-loader';

describe('parseConfigContent', () => {
  it('parses YAML and validates with schema', () => {
    const schema = z.object({ name: z.string() });
    const result = parseConfigContent('name: test\n', schema);

    expect(result).toEqual({ name: 'test' });
  });

  it('parses JSON content', () => {
    const result = parseConfigContent('{"name":"test"}');

    expect(result).toEqual({ name: 'test' });
  });
});

describe('loadConfigFile', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loadweaver-config-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('merges profile overlay before validation', () => {
    const configPath = path.join(tempDir, 'loadweaver.yml');
    fs.writeFileSync(
      configPath,
      [
        'version: 1',
        'cluster:',
        '  name: base',
        '  primaryManager: node-a1',
        'profiles:',
        '  prod:',
        '    cluster:',
        '      name: prod',
      ].join('\n'),
    );

    const schema = z.object({
      version: z.number(),
      cluster: z.object({ name: z.string(), primaryManager: z.string() }),
      profiles: z.record(z.string(), z.object({ cluster: z.object({ name: z.string() }) })).optional(),
    });

    const loaded = loadConfigFile(configPath, { profile: 'prod', schema });

    expect(loaded.cluster).toEqual({ name: 'prod', primaryManager: 'node-a1' });
  });

  it('deep-merges YAML overlays after the file with overlay winning', () => {
    const configPath = path.join(tempDir, 'loadweaver.yml');
    fs.writeFileSync(
      configPath,
      ['version: 1', 'vip:', '  address: 10.0.0.1', '  interface: eth0', '  authPass: filepass'].join('\n'),
    );

    const schema = z.object({
      version: z.number(),
      vip: z.object({
        address: z.string(),
        interface: z.string(),
        authPass: z.string(),
      }),
    });

    const loaded = loadConfigFile(configPath, {
      schema,
      overlays: ['vip:\n  authPass: envpass\n'],
    });

    expect(loaded.vip).toEqual({
      address: '10.0.0.1',
      interface: 'eth0',
      authPass: 'envpass',
    });
  });

  it('throws when config file is missing', () => {
    expect(() => loadConfigFile(path.join(tempDir, 'missing.yml'))).toThrow(/Config file not found/);
  });
});

describe('writeTemplate', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loadweaver-template-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('writes template content to a new file', () => {
    const outputPath = path.join(tempDir, 'nested', 'loadweaver.yml');
    writeTemplate(outputPath, 'version: 1\n');

    expect(fs.readFileSync(outputPath, 'utf-8')).toBe('version: 1\n');
  });

  it('refuses to overwrite an existing file', () => {
    const outputPath = path.join(tempDir, 'loadweaver.yml');
    fs.writeFileSync(outputPath, 'existing');

    expect(() => writeTemplate(outputPath, 'version: 1\n')).toThrow(/already exists/);
  });
});
