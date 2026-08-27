import type { LoadweaverConfig } from '../config/schema';

import { deriveClusterCidr } from './derive-cluster-cidr.service';
import { resolveRoutingHubNodes } from './resolve-routing-hubs.service';

export interface RoutingPeerSnapshot {
  name: string;
  remoteAsn: number;
  neighbor: string;
}

export interface RoutingStateSnapshot {
  enabled: boolean;
  hubNodes: string[];
  localAsn: number | null;
  clusterCidr: string | null;
  exportWireguardSubnet: boolean;
  peers: RoutingPeerSnapshot[];
}

export function deriveRoutingStateSnapshot(config: LoadweaverConfig): RoutingStateSnapshot {
  if (!config.routing?.enabled) {
    return {
      enabled: false,
      hubNodes: [],
      localAsn: null,
      clusterCidr: null,
      exportWireguardSubnet: true,
      peers: [],
    };
  }

  return {
    enabled: true,
    hubNodes: resolveRoutingHubNodes(config),
    localAsn: config.routing.localAsn ?? null,
    clusterCidr: deriveClusterCidr(config),
    exportWireguardSubnet: config.routing.exportWireguardSubnet ?? true,
    peers: (config.routing.peers ?? []).map((peer) => ({
      name: peer.name,
      remoteAsn: peer.remoteAsn,
      neighbor: peer.neighbor,
    })),
  };
}

export function routingStateChanged(previous: RoutingStateSnapshot, current: RoutingStateSnapshot): boolean {
  if (previous.enabled !== current.enabled) {
    return true;
  }

  if (!current.enabled) {
    return false;
  }

  return (
    previous.localAsn !== current.localAsn ||
    previous.clusterCidr !== current.clusterCidr ||
    previous.exportWireguardSubnet !== current.exportWireguardSubnet ||
    JSON.stringify(previous.hubNodes) !== JSON.stringify(current.hubNodes) ||
    JSON.stringify(previous.peers) !== JSON.stringify(current.peers)
  );
}
