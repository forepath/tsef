import {
  buildAcmeEnvFileTemplate,
  buildAcmeEnvSourceCommand,
  buildDnsEnvPresenceCheck,
  missingServiceEnvVars,
  parseDockerServiceEnvLines,
  requiredDnsEnvVars,
} from './traefik-acme-env.service';

describe('traefik acme env', () => {
  it('lists provider-specific env vars', () => {
    expect(requiredDnsEnvVars('cloudflare')).toEqual(['CF_DNS_API_TOKEN']);
    expect(requiredDnsEnvVars('route53')).toEqual(['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION']);
  });

  it('builds shell presence checks for deploy', () => {
    expect(buildDnsEnvPresenceCheck('cloudflare')).toContain('CF_DNS_API_TOKEN');
    expect(buildAcmeEnvSourceCommand('/etc/loadweaver/traefik-acme.env')).toContain('/etc/loadweaver/traefik-acme.env');
  });

  it('builds env file template with provider variables', () => {
    expect(buildAcmeEnvFileTemplate('cloudflare')).toContain('# CF_DNS_API_TOKEN=');
  });

  it('detects missing service env vars after stack deploy', () => {
    const env = parseDockerServiceEnvLines('CF_DNS_API_TOKEN=secret\nPATH=/usr/bin');
    expect(missingServiceEnvVars('cloudflare', env)).toEqual([]);
    expect(missingServiceEnvVars('cloudflare', {})).toEqual(['CF_DNS_API_TOKEN']);
  });
});
