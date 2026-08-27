import type { LoadweaverConfig } from '@forepath/loadweaver/shared/util-cli-core';
import { deriveClusterCidr, resolveRoutingHubNodes } from '@forepath/loadweaver/shared/util-cli-core';
import { renderTemplate } from '@forepath/loadweaver/shared/util-cli-core';

import { BIRD_CONF_TEMPLATE } from './templates';

export interface BirdPeerDefinition {
  protocolName: string;
  neighbor: string;
  remoteAsn: number;
  localAsn: number;
  multihop: boolean;
  importFilter: 'accept' | 'none';
  exportFilter: 'cluster' | 'none';
  importCidrs: string[];
}

function sanitizeProtocolName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_]/g, '_');
}

function clusterPrefix(clusterCidr: string): string {
  const [network, prefix] = clusterCidr.split('/');
  return `${network}/${prefix ?? '24'}`;
}

function buildClusterExportFilter(clusterCidr: string): string {
  const prefix = clusterPrefix(clusterCidr);
  return `filter cluster_export {
  if net ~ [ ${prefix}+ ] then accept;
  reject;
}`;
}

function buildImportFilter(name: string, importFilter: 'accept' | 'none', importCidrs: string[]): string {
  if (importFilter === 'none') {
    return `filter import_${name} {
  reject;
}`;
  }

  if (importCidrs.length === 0) {
    return `filter import_${name} {
  accept;
}`;
  }

  const nets = importCidrs.map((cidr) => `${clusterPrefix(cidr)}+`).join(', ');
  return `filter import_${name} {
  if net ~ [ ${nets} ] then accept;
  reject;
}`;
}

function buildExportReference(exportFilter: 'cluster' | 'none'): string {
  return exportFilter === 'cluster' ? 'cluster_export' : 'reject';
}

function buildImportReference(name: string, importFilter: 'accept' | 'none'): string {
  return importFilter === 'none' ? 'reject' : `import_${name}`;
}

export function buildBirdPeerDefinitions(config: LoadweaverConfig, hubNodeId: string): BirdPeerDefinition[] {
  const routing = config.routing;

  if (!routing?.enabled || !routing.localAsn) {
    return [];
  }

  const hubNodes = resolveRoutingHubNodes(config);
  const localHubIp = config.nodes[hubNodeId]?.wireguardIp;

  if (!localHubIp) {
    throw new Error(`Unknown routing hub node: ${hubNodeId}`);
  }

  const peers: BirdPeerDefinition[] = [];

  for (const otherHubId of hubNodes) {
    if (otherHubId === hubNodeId) {
      continue;
    }

    const neighbor = config.nodes[otherHubId]?.wireguardIp;

    if (!neighbor) {
      continue;
    }

    peers.push({
      protocolName: sanitizeProtocolName(`hub_${otherHubId}`),
      neighbor,
      remoteAsn: routing.localAsn,
      localAsn: routing.localAsn,
      multihop: false,
      importFilter: 'accept',
      exportFilter: routing.exportWireguardSubnet === false ? 'none' : 'cluster',
      importCidrs: [],
    });
  }

  for (const peer of routing.peers ?? []) {
    const isIntraHub = hubNodes.some((hubId) => config.nodes[hubId]?.wireguardIp === peer.neighbor);

    if (isIntraHub) {
      continue;
    }

    peers.push({
      protocolName: sanitizeProtocolName(`peer_${peer.name}`),
      neighbor: peer.neighbor,
      remoteAsn: peer.remoteAsn,
      localAsn: routing.localAsn,
      multihop: peer.multihop ?? false,
      importFilter: peer.importFilter ?? 'accept',
      exportFilter: peer.exportFilter ?? 'cluster',
      importCidrs: peer.wireguardPeer?.allowedIps ?? [],
    });
  }

  return peers;
}

export function buildBirdConfig(config: LoadweaverConfig, hubNodeId: string): string {
  const routing = config.routing;

  if (!routing?.enabled || !routing.localAsn) {
    throw new Error('Routing is not enabled in configuration');
  }

  const routerId = config.nodes[hubNodeId]?.wireguardIp;

  if (!routerId) {
    throw new Error(`Missing wireguardIp for routing hub ${hubNodeId}`);
  }

  const clusterCidr = deriveClusterCidr(config);
  const peers = buildBirdPeerDefinitions(config, hubNodeId);
  const filters = [
    routing.exportWireguardSubnet === false ? '' : buildClusterExportFilter(clusterCidr),
    ...peers.map((peer) => buildImportFilter(peer.protocolName, peer.importFilter, peer.importCidrs)),
  ]
    .filter(Boolean)
    .join('\n\n');

  const staticProtocol =
    routing.exportWireguardSubnet === false
      ? ''
      : `protocol static {
  ipv4;
  route ${clusterPrefix(clusterCidr)} via "${config.wireguard.interface}";
}`;

  const bgpProtocols = peers
    .map((peer) => {
      const multihopLine = peer.multihop ? '  multihop;\n' : '';
      return `protocol bgp ${peer.protocolName} {
  local ${routerId} as ${peer.localAsn};
  neighbor ${peer.neighbor} as ${peer.remoteAsn};
${multihopLine}  ipv4 {
    import ${buildImportReference(peer.protocolName, peer.importFilter)};
    export ${buildExportReference(peer.exportFilter)};
  };
}`;
    })
    .join('\n\n');

  return renderTemplate(BIRD_CONF_TEMPLATE, {
    routerId,
    filters,
    staticProtocol,
    bgpProtocols,
  });
}

export { sanitizeProtocolName };
