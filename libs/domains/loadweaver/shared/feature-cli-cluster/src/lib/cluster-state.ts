import * as fs from 'node:fs';
import * as path from 'node:path';

import type { LoadweaverConfig } from '@forepath/loadweaver/shared/util-cli-core';
import {
  clusterStatePath,
  deriveExpectedSwarmLabels,
  deriveOsdDevices,
  deriveRoutingStateSnapshot,
  deriveVipStateSnapshot,
} from '@forepath/loadweaver/shared/util-cli-core';

import type { RemoteFingerprint } from './remote-fingerprint';
import { sanitizeDesiredConfig } from './sanitize-desired-config';

export interface DeriveStateOptions {
  previous?: ClusterState;
  bumpSerial?: boolean;
  keepDesired?: boolean;
}

export interface ClusterState {
  version: number;
  clusterName: string;
  nodes: string[];
  swarmLabels: Record<string, string[]>;
  traefikImage: string;
  traefikMode: string;
  traefikAcmeEnabled: boolean;
  traefikAcmeChallengeType: 'http' | 'dns' | null;
  traefikAcmeDnsProvider: string | null;
  osdDevices: Record<string, string>;
  cephOsdNodes: string[];
  overlayNetworks: string[];
  volumes: string[];
  vipConfigured: boolean;
  vipFingerprint?: string;
  routingEnabled: boolean;
  routingHubNodes: string[];
  routingLocalAsn: number | null;
  routingClusterCidr: string | null;
  routingExportWireguardSubnet: boolean;
  routingPeers: Array<{ name: string; remoteAsn: number; neighbor: string }>;
  nodeHostnames: Record<string, string>;
  updatedAt: string;
  inventorySerial?: number;
  desired?: LoadweaverConfig;
  remoteFingerprint?: RemoteFingerprint;
}

export function defaultStatePath(configPath: string): string {
  return clusterStatePath(configPath);
}

export function deriveStateFromConfig(
  config: LoadweaverConfig,
  remoteFingerprint?: RemoteFingerprint,
  options: DeriveStateOptions = {},
): ClusterState {
  const routing = deriveRoutingStateSnapshot(config);
  const vip = deriveVipStateSnapshot(config);
  const previousSerial = options.previous?.inventorySerial ?? 0;
  const bumpSerial = options.bumpSerial !== false;
  const inventorySerial = bumpSerial ? previousSerial + 1 : previousSerial || undefined;
  const desired = options.keepDesired
    ? (options.previous?.desired ?? sanitizeDesiredConfig(config))
    : sanitizeDesiredConfig(config);

  return {
    version: config.version,
    clusterName: config.cluster.name,
    nodes: Object.keys(config.nodes).sort(),
    swarmLabels: deriveExpectedSwarmLabels(config),
    traefikImage: config.traefik.image,
    traefikMode: config.traefik.mode,
    traefikAcmeEnabled: Boolean(config.traefik.acme),
    traefikAcmeChallengeType: config.traefik.acme?.challengeType ?? null,
    traefikAcmeDnsProvider: config.traefik.acme?.dnsProvider ?? null,
    osdDevices: deriveOsdDevices(config),
    cephOsdNodes: Object.keys(config.nodes)
      .filter((nodeId) => config.nodes[nodeId].roles.includes('ceph-osd'))
      .sort(),
    overlayNetworks: [...config.swarm.overlayNetworks].sort(),
    volumes: config.volumes.map((volume) => volume.name).sort(),
    vipConfigured: vip.configured,
    vipFingerprint: vip.fingerprint || undefined,
    routingEnabled: routing.enabled,
    routingHubNodes: routing.hubNodes,
    routingLocalAsn: routing.localAsn,
    routingClusterCidr: routing.clusterCidr,
    routingExportWireguardSubnet: routing.exportWireguardSubnet,
    routingPeers: routing.peers,
    nodeHostnames: Object.fromEntries(Object.entries(config.nodes).map(([nodeId, node]) => [nodeId, node.hostname])),
    updatedAt: new Date().toISOString(),
    ...(inventorySerial !== undefined ? { inventorySerial } : {}),
    ...(desired ? { desired } : {}),
    ...(remoteFingerprint ? { remoteFingerprint } : {}),
  };
}

export function loadClusterState(configPath: string): ClusterState | undefined {
  const absolutePath = clusterStatePath(configPath);

  if (!fs.existsSync(absolutePath)) {
    return undefined;
  }

  return JSON.parse(fs.readFileSync(absolutePath, 'utf-8')) as ClusterState;
}

export function saveClusterState(configPath: string, state: ClusterState): void {
  const absolutePath = clusterStatePath(configPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(state, null, 2)}\n`, 'utf-8');
}

export { clusterStatePath };
