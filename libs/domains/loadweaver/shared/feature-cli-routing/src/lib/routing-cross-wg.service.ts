import * as fs from 'node:fs';
import * as path from 'node:path';

import type { LoadweaverConfig } from '@forepath/loadweaver/shared/util-cli-core';
import { resolveRoutingHubNodes } from '@forepath/loadweaver/shared/util-cli-core';
import { routingKeysPath } from '@forepath/loadweaver/shared/util-cli-core';

export interface CrossWireguardKeyPair {
  privateKey: string;
  publicKey: string;
}

export interface CrossWireguardKeyStore {
  nodes: Record<string, Record<string, CrossWireguardKeyPair>>;
}

export function loadCrossWireguardKeyStore(configPath: string): CrossWireguardKeyStore {
  const absolutePath = routingKeysPath(configPath);

  if (!fs.existsSync(absolutePath)) {
    return { nodes: {} };
  }

  return JSON.parse(fs.readFileSync(absolutePath, 'utf-8')) as CrossWireguardKeyStore;
}

export function saveCrossWireguardKeyStore(configPath: string, store: CrossWireguardKeyStore): void {
  const absolutePath = routingKeysPath(configPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(store, null, 2)}\n`, 'utf-8');
}

export function generateDryRunCrossWireguardKeyPair(nodeId: string, iface: string): CrossWireguardKeyPair {
  return {
    privateKey: `<generated-${nodeId}-${iface}-private-key>`,
    publicKey: `<generated-${nodeId}-${iface}-public-key>`,
  };
}

function defaultCrossLinkAddress(hubNodeId: string, hubNodes: string[]): string {
  const index = hubNodes.indexOf(hubNodeId);
  return `10.210.0.${index + 1}/32`;
}

export function renderCrossWireguardConfig(
  config: LoadweaverConfig,
  hubNodeId: string,
  keys: CrossWireguardKeyStore,
): string {
  const routing = config.routing;

  if (!routing?.enabled) {
    return '';
  }

  const hubNodes = resolveRoutingHubNodes(config);
  const sections: string[] = [];

  for (const peer of routing.peers ?? []) {
    if (!peer.wireguardPeer) {
      continue;
    }

    const iface = peer.wireguardPeer.interface ?? 'wg1';
    const nodeKeys = keys.nodes[hubNodeId]?.[iface] ?? generateDryRunCrossWireguardKeyPair(hubNodeId, iface);
    const address = peer.wireguardPeer.localAddress ?? defaultCrossLinkAddress(hubNodeId, hubNodes);
    const listenPort = peer.wireguardPeer.listenPort ?? config.wireguard.port + 1;
    const allowedIps = peer.wireguardPeer.allowedIps.join(', ');

    sections.push(`# loadweaver cross-cluster peer: ${peer.name}
cat > /etc/wireguard/${iface}.conf <<'EOF'
[Interface]
Address = ${address}
ListenPort = ${listenPort}
PrivateKey = ${nodeKeys.privateKey}

[Peer]
PublicKey = ${peer.wireguardPeer.publicKey}
AllowedIPs = ${allowedIps}
Endpoint = ${peer.wireguardPeer.endpoint}
PersistentKeepalive = 25
EOF
chmod 600 /etc/wireguard/${iface}.conf
wg-quick down ${iface} || true
wg-quick up ${iface} || wg show ${iface} || true`);
  }

  return sections.join('\n\n');
}

export function renderCrossWireguardTeardown(config: LoadweaverConfig): string {
  const routing = config.routing;

  if (!routing?.enabled) {
    return '';
  }

  const interfaces = new Set<string>();

  for (const peer of routing.peers ?? []) {
    if (peer.wireguardPeer) {
      interfaces.add(peer.wireguardPeer.interface ?? 'wg1');
    }
  }

  return [...interfaces].map((iface) => `wg-quick down ${iface} || true`).join('\n');
}
