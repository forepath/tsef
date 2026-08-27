export type DnsProvider = 'cloudflare' | 'route53' | 'digitalocean';

export const DEFAULT_ACME_ENV_FILE = '/etc/loadweaver/traefik-acme.env';

export function requiredDnsEnvVars(provider: DnsProvider): string[] {
  switch (provider) {
    case 'cloudflare':
      return ['CF_DNS_API_TOKEN'];
    case 'route53':
      return ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'];
    case 'digitalocean':
      return ['DO_AUTH_TOKEN'];
    default: {
      const exhaustive: never = provider;
      throw new Error(`Unsupported DNS provider: ${exhaustive}`);
    }
  }
}

export function buildDnsEnvPresenceCheck(provider: DnsProvider): string {
  return requiredDnsEnvVars(provider)
    .map((variable) => `[ -n "\${${variable}}" ] || { echo "Missing ${variable} on primary manager"; exit 1; }`)
    .join('\n');
}

export function buildAcmeEnvFileTemplate(provider: DnsProvider): string {
  const lines = [
    '# Loadweaver Traefik ACME DNS credentials (keep chmod 600)',
    '# Uncomment and set values, then re-run: loadweaver traefik deploy',
    '',
  ];

  for (const variable of requiredDnsEnvVars(provider)) {
    lines.push(`# ${variable}=`);
  }

  return `${lines.join('\n')}\n`;
}

export function buildAcmeEnvSourceCommand(envFile: string): string {
  return `if [ -f ${envFile} ]; then set -a && . ${envFile} && set +a; fi`;
}

export function parseDockerServiceEnvLines(output: string): Record<string, string> {
  const env: Record<string, string> = {};

  for (const line of output.split('\n')) {
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex === -1) {
      env[trimmed] = '';
      continue;
    }

    env[trimmed.slice(0, separatorIndex)] = trimmed.slice(separatorIndex + 1);
  }

  return env;
}

export function missingServiceEnvVars(provider: DnsProvider, serviceEnv: Record<string, string>): string[] {
  return requiredDnsEnvVars(provider).filter((variable) => !(variable in serviceEnv));
}
