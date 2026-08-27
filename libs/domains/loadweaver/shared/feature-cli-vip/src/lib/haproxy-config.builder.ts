export type ResolvedBackendServer = {
  name: string;
  address: string;
  port: number;
};

export type HaproxyFrontendSpec = {
  name: string;
  port: number;
  protocol: 'tcp' | 'http';
  servers: ResolvedBackendServer[];
};

export function buildHaproxyConfig(frontends: HaproxyFrontendSpec[]): string {
  const lines = [
    'global',
    '  log /dev/log local0',
    '  maxconn 4096',
    '',
    'defaults',
    '  log global',
    '  mode tcp',
    '  option dontlognull',
    '  timeout connect 5s',
    '  timeout client 50s',
    '  timeout server 50s',
    '',
  ];

  for (const frontend of frontends) {
    const mode = frontend.protocol === 'http' ? 'http' : 'tcp';
    lines.push(`frontend fe_${frontend.name}`);
    lines.push(`  bind *:${frontend.port}`);
    lines.push(`  mode ${mode}`);
    lines.push(`  default_backend be_${frontend.name}`);
    lines.push('');
    lines.push(`backend be_${frontend.name}`);
    lines.push(`  mode ${mode}`);
    lines.push('  balance roundrobin');

    if (frontend.servers.length === 0) {
      lines.push('  # no backends resolved');
    } else {
      for (const server of frontend.servers) {
        const check = mode === 'http' ? ' check' : ' check';
        lines.push(`  server ${server.name} ${server.address}:${server.port}${check}`);
      }
    }

    lines.push('');
  }

  return `${lines.join('\n').trimEnd()}\n`;
}
