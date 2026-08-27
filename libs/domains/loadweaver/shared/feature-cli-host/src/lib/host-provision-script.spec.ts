import { buildHostBootstrapScript, buildHostVerificationScript, parseOsRelease } from './host-provision-script';

describe('host provision scripts', () => {
  it('parses os-release content', () => {
    expect(
      parseOsRelease(`ID=debian
VERSION_CODENAME=bookworm
`),
    ).toEqual({ id: 'debian', versionCodename: 'bookworm' });
  });

  it('builds a docker and wireguard bootstrap script for debian', () => {
    const script = buildHostBootstrapScript(
      { id: 'debian', versionCodename: 'bookworm' },
      {
        installKeepalived: true,
        installHaproxy: true,
        installBird: false,
        installCephadm: true,
        cephRelease: 'quincy',
        wireguardPort: 51820,
        configureFirewall: true,
        listenerPorts: [5432],
      },
    );

    expect(script).toContain('docker-ce');
    expect(script).toContain('wireguard-tools');
    expect(script).toContain('keepalived');
    expect(script).toContain('haproxy');
    expect(script).toContain('cephadm');
    expect(script).toContain('ufw allow 2377/tcp');
    expect(script).toContain("ufw allow 5432/tcp comment 'loadweaver-vip-pool'");
  });

  it('omits optional packages when not requested', () => {
    const script = buildHostBootstrapScript(
      { id: 'ubuntu', versionCodename: 'jammy' },
      {
        installKeepalived: false,
        installHaproxy: false,
        installBird: false,
        installCephadm: false,
        cephRelease: 'quincy',
        wireguardPort: 51820,
        configureFirewall: false,
      },
    );

    expect(script).not.toContain('keepalived');
    expect(script).not.toContain('haproxy');
    expect(script).not.toContain('cephadm add-repo');
  });

  it('builds verification commands for required software', () => {
    const script = buildHostVerificationScript({
      docker: true,
      wireguard: true,
      keepalived: true,
      haproxy: true,
      bird: false,
      cephadm: false,
    });

    expect(script).toContain('command -v docker');
    expect(script).toContain('command -v keepalived');
    expect(script).toContain('command -v haproxy');
    expect(script).not.toContain('cephadm');
  });
});

describe('HostService', () => {
  it('bootstraps all nodes in dry-run mode', async () => {
    const commands: string[] = [];
    const ctx = {
      options: { configPath: './loadweaver.yml', dryRun: true, verbose: false, debug: false, yes: false, local: false },
      config: {
        version: 1,
        cluster: { name: 'test', primaryManager: 'node-a1' },
        nodes: {
          'node-a1': { hostname: 'a1', wireguardIp: '10.200.0.1', roles: ['manager', 'ceph-mon'] },
        },
        wireguard: {
          interface: 'wg0',
          port: 51820,
          mtu: 1420,
          keyRotation: { enabled: false, intervalDays: 90, warnBeforeDays: 14 },
        },
        swarm: { advertiseInterface: 'wg0', overlayNetworks: [] },
        ceph: { fsName: 'fs', mountPath: '/mnt/cephfs', replication: 3, release: 'quincy' },
        traefik: { image: 'traefik:v3', network: 'traefik-public', mode: 'global' as const },
        volumes: [],
        host: { configureFirewall: true },
        vip: { address: '10.0.0.1', interface: 'eth0', backend: 'keepalived' as const },
      },
      logger: { error: () => undefined, warn: () => undefined, info: () => undefined, debug: () => undefined },
      sshForNode: () => ({
        execRemote: async (command: string) => {
          commands.push(command);
          return {
            command,
            stdout: command.includes('os-release') ? 'ID=debian\nVERSION_CODENAME=bookworm\n' : 'ok',
            stderr: '',
            exitCode: 0,
            dryRun: true,
          };
        },
        uploadFile: async () => ({ command: '', stdout: '', stderr: '', exitCode: 0, dryRun: true }),
      }),
      sshTargetForNode: () => ({ host: '127.0.0.1', user: 'root' }),
    };

    const { HostService } = await import('./host.service');
    await new HostService(ctx as never).bootstrapAll();

    expect(commands.some((command) => command.includes('docker-ce'))).toBe(true);
    expect(commands.some((command) => command.includes('wireguard-tools'))).toBe(true);
  });
});
