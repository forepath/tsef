import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { LOADWEAVER_CONFIG_ENV, loadLoadweaverConfig } from './load-loadweaver-config';

const minimalConfig = `version: 1
cluster:
  name: base
  primaryManager: node-a1
nodes:
  node-a1:
    hostname: a1.example.com
    wireguardIp: 10.200.0.1
    roles: [manager]
vip:
  address: 203.0.113.100
  interface: eth0
  backend: keepalived
  authPass: filepass
`;

describe('loadLoadweaverConfig', () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loadweaver-env-config-'));
    configPath = path.join(tempDir, 'loadweaver.yml');
    fs.writeFileSync(configPath, minimalConfig);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('loads the file when LOADWEAVER_CONFIG is unset', () => {
    const config = loadLoadweaverConfig(configPath, { processEnv: {} });

    expect(config.vip?.authPass).toBe('filepass');
    expect(config.cluster.name).toBe('base');
  });

  it('deep-merges LOADWEAVER_CONFIG YAML over the file', () => {
    const config = loadLoadweaverConfig(configPath, {
      processEnv: {
        [LOADWEAVER_CONFIG_ENV]: ['vip:', '  authPass: envpass', 'cluster:', '  name: from-env'].join('\n'),
      },
    });

    expect(config.vip?.authPass).toBe('envpass');
    expect(config.vip?.address).toBe('203.0.113.100');
    expect(config.cluster.name).toBe('from-env');
    expect(config.cluster.primaryManager).toBe('node-a1');
  });
});
