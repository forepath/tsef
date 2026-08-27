export interface HostProvisionOptions {
  installKeepalived: boolean;
  installHaproxy: boolean;
  installBird: boolean;
  installCephadm: boolean;
  cephRelease: string;
  wireguardPort: number;
  configureFirewall: boolean;
  aptProxy?: string;
  listenerPorts?: number[];
}

export interface HostOsInfo {
  id: string;
  versionCodename: string;
}

export function parseOsRelease(content: string): HostOsInfo {
  const values = Object.fromEntries(
    content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        const key = line.slice(0, index);
        const rawValue = line.slice(index + 1).replace(/^"|"$/g, '');

        return [key, rawValue];
      }),
  );

  const id = values['ID'];

  if (!id) {
    throw new Error('Unable to detect OS ID from /etc/os-release');
  }

  return {
    id,
    versionCodename: values['VERSION_CODENAME'] ?? values['VERSION_ID'] ?? 'stable',
  };
}

function aptProxyBlock(aptProxy?: string): string {
  if (!aptProxy) {
    return '';
  }

  return `
export http_proxy='${aptProxy.replace(/'/g, `'\\''`)}'
export https_proxy='${aptProxy.replace(/'/g, `'\\''`)}'
`;
}

function firewallBlock(configureFirewall: boolean, wireguardPort: number, listenerPorts: number[] = []): string {
  if (!configureFirewall) {
    return '';
  }

  const listenerRules = listenerPorts
    .map((port) => `  ufw allow ${port}/tcp comment 'loadweaver-vip-pool' || true`)
    .join('\n');

  return `
if command -v ufw >/dev/null 2>&1; then
  ufw allow 2377/tcp comment 'loadweaver-swarm' || true
  ufw allow 7946/tcp comment 'loadweaver-swarm' || true
  ufw allow 7946/udp comment 'loadweaver-swarm' || true
  ufw allow 4789/udp comment 'loadweaver-swarm' || true
  ufw allow ${wireguardPort}/udp comment 'loadweaver-wireguard' || true
  ufw allow 80/tcp comment 'loadweaver-traefik' || true
  ufw allow 443/tcp comment 'loadweaver-traefik' || true
  ufw allow proto 112 comment 'loadweaver-keepalived' || true
${listenerRules}
  ufw --force enable || true
fi
`;
}

export function buildHostBootstrapScript(os: HostOsInfo, options: HostProvisionOptions): string {
  if (os.id !== 'debian' && os.id !== 'ubuntu') {
    throw new Error(`Unsupported OS "${os.id}". Loadweaver host bootstrap supports Debian and Ubuntu only.`);
  }

  const keepalivedBlock = options.installKeepalived
    ? `
if ! command -v keepalived >/dev/null 2>&1; then
  apt-get install -y --no-install-recommends keepalived
fi
systemctl enable keepalived >/dev/null 2>&1 || true
`
    : '';

  const haproxyBlock = options.installHaproxy
    ? `
if ! command -v haproxy >/dev/null 2>&1; then
  apt-get install -y --no-install-recommends haproxy
fi
systemctl enable haproxy >/dev/null 2>&1 || true
`
    : '';

  const birdBlock = options.installBird
    ? `
if ! command -v bird >/dev/null 2>&1; then
  apt-get install -y --no-install-recommends bird2
fi
systemctl enable bird >/dev/null 2>&1 || true
`
    : '';

  const cephadmBlock = options.installCephadm
    ? `
if ! command -v cephadm >/dev/null 2>&1; then
  curl --fail --silent --show-error --remote-name --location \\
    "https://github.com/ceph/ceph/raw/${options.cephRelease}/src/cephadm/cephadm"
  chmod +x cephadm
  ./cephadm add-repo --release ${options.cephRelease}
  ./cephadm install
  rm -f cephadm
fi
`
    : '';

  return `#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
${aptProxyBlock(options.aptProxy)}
if [ "$(id -u)" -ne 0 ]; then
  echo "Host bootstrap must run as root or via passwordless sudo." >&2
  exit 1
fi

apt-get update
apt-get install -y --no-install-recommends \\
  ca-certificates curl gnupg lsb-release \\
  apt-transport-https software-properties-common \\
  chrony lvm2 iproute2 iputils-ping ufw

if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL "https://download.docker.com/linux/${os.id}/gpg" -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/${os.id} ${os.versionCodename} stable" \\
    > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y --no-install-recommends \\
    docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

systemctl enable --now docker

if ! command -v wg >/dev/null 2>&1 || ! command -v wg-quick >/dev/null 2>&1; then
  apt-get install -y --no-install-recommends wireguard wireguard-tools
fi
modprobe wireguard >/dev/null 2>&1 || true
${keepalivedBlock}${haproxyBlock}${birdBlock}${cephadmBlock}${firewallBlock(
    options.configureFirewall,
    options.wireguardPort,
    options.listenerPorts ?? [],
  )}
echo "loadweaver host bootstrap complete"
`;
}

export interface HostSoftwareRequirements {
  docker: boolean;
  wireguard: boolean;
  keepalived: boolean;
  haproxy: boolean;
  bird: boolean;
  cephadm: boolean;
}

export function buildHostVerificationScript(requirements: HostSoftwareRequirements): string {
  const checks: string[] = ['command -v docker', 'docker info >/dev/null 2>&1', 'command -v wg', 'command -v wg-quick'];

  if (requirements.keepalived) {
    checks.push('command -v keepalived');
  }

  if (requirements.haproxy) {
    checks.push('command -v haproxy');
  }

  if (requirements.bird) {
    checks.push('command -v bird');
    checks.push('command -v birdc');
  }

  if (requirements.cephadm) {
    checks.push('command -v cephadm');
  }

  return checks.join(' && ');
}
