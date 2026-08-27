import type { LoadweaverConfig } from '@forepath/loadweaver/shared/util-cli-core';
import { resolveVipPools } from '@forepath/loadweaver/shared/util-cli-core';

const DEFAULT_AUTH_PASS = 'loadwv01';
const DEFAULT_TRAEFIK_ROUTER_ID = 51;

export function buildKeepalivedConfig(config: LoadweaverConfig, priority: number): string {
  if (!config.vip) {
    throw new Error('VIP configuration is missing');
  }

  const blocks: string[] = [];

  if (config.vip.address) {
    blocks.push(`vrrp_script chk_traefik {
  script "curl -f http://127.0.0.1:80/ || exit 1"
  interval 2
  weight 2
}

vrrp_instance VI_traefik {
  state BACKUP
  interface ${config.vip.interface}
  virtual_router_id ${config.vip.routerId ?? DEFAULT_TRAEFIK_ROUTER_ID}
  priority ${priority}
  advert_int 1
  authentication {
    auth_type PASS
    auth_pass ${config.vip.authPass ?? DEFAULT_AUTH_PASS}
  }
  virtual_ipaddress {
    ${config.vip.address}
  }
  track_script {
    chk_traefik
  }
}`);
  }

  for (const pool of resolveVipPools(config)) {
    const safeName = pool.name.replace(/[^A-Za-z0-9_]/g, '_');
    const scriptName = `chk_pool_${safeName}`;
    const healthScript =
      pool.healthCheck.type === 'http'
        ? `curl -f http://127.0.0.1:${pool.healthCheck.port}${pool.healthCheck.path} || exit 1`
        : `nc -z 127.0.0.1 ${pool.healthCheck.port} || exit 1`;

    blocks.push(`vrrp_script ${scriptName} {
  script "${healthScript}"
  interval 2
  weight 2
}

vrrp_instance VI_${safeName} {
  state BACKUP
  interface ${pool.interface}
  virtual_router_id ${pool.routerId}
  priority ${priority}
  advert_int 1
  authentication {
    auth_type PASS
    auth_pass ${pool.authPass}
  }
  virtual_ipaddress {
    ${pool.address}
  }
  track_script {
    ${scriptName}
  }
}`);
  }

  return `${blocks.join('\n\n')}\n`;
}
