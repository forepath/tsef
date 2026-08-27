import type { LoadweaverConfig } from '@forepath/loadweaver/shared/util-cli-core';
import {
  diffOsdDeviceChanges,
  diffSwarmLabelChanges,
  deriveOsdDevices,
  deriveRoutingStateSnapshot,
  deriveVipStateSnapshot,
  routingStateChanged,
  vipStateChanged,
} from '@forepath/loadweaver/shared/util-cli-core';

import type { ClusterState } from './cluster-state';

export type UpdateAction =
  | { type: 'host.bootstrap'; nodeId: string }
  | { type: 'wireguard.reconcile' }
  | { type: 'wireguard.add-peer'; nodeId: string }
  | { type: 'wireguard.remove-peer'; nodeId: string }
  | { type: 'swarm.join'; nodeIds: string[] }
  | { type: 'swarm.reconcile-labels'; nodeIds: string[] }
  | { type: 'ceph.mount'; nodeIds: string[] }
  | { type: 'ceph.osd-add'; nodeId: string }
  | { type: 'ceph.osd-remove'; nodeId: string; hostname: string }
  | { type: 'ceph.osd-reconcile' }
  | { type: 'volume.create'; volumeNames: string[] }
  | { type: 'swarm.network.create'; networkNames: string[] }
  | { type: 'traefik.update' }
  | { type: 'vip.init' }
  | { type: 'vip.reconcile' }
  | { type: 'vip.destroy' }
  | { type: 'routing.init' }
  | { type: 'routing.reconcile' }
  | { type: 'routing.destroy' }
  | { type: 'node.leave'; nodeId: string };

function diffAdded(previous: string[], current: string[]): string[] {
  const previousSet = new Set(previous);
  return current.filter((item) => !previousSet.has(item));
}

function diffRemoved(previous: string[], current: string[]): string[] {
  const currentSet = new Set(current);
  return previous.filter((item) => !currentSet.has(item));
}

export function planClusterUpdate(
  previous: ClusterState | undefined,
  config: LoadweaverConfig,
  options: { allowNodeRemoval: boolean },
): UpdateAction[] {
  if (!previous) {
    return [];
  }

  const current = {
    nodes: Object.keys(config.nodes).sort(),
    traefikImage: config.traefik.image,
    traefikMode: config.traefik.mode,
    traefikAcmeEnabled: Boolean(config.traefik.acme),
    traefikAcmeChallengeType: config.traefik.acme?.challengeType ?? null,
    traefikAcmeDnsProvider: config.traefik.acme?.dnsProvider ?? null,
    osdDevices: deriveOsdDevices(config),
    overlayNetworks: [...config.swarm.overlayNetworks].sort(),
    volumes: config.volumes.map((volume) => volume.name).sort(),
    vipConfigured: Boolean(config.vip),
    vipFingerprint: deriveVipStateSnapshot(config).fingerprint,
    routing: deriveRoutingStateSnapshot(config),
  };

  const actions: UpdateAction[] = [];
  const addedNodes = diffAdded(previous.nodes, current.nodes);
  const removedNodes = diffRemoved(previous.nodes, current.nodes);

  if (addedNodes.length > 0) {
    for (const nodeId of addedNodes) {
      actions.push({ type: 'host.bootstrap', nodeId });
    }

    actions.push({ type: 'wireguard.reconcile' });

    for (const nodeId of addedNodes) {
      actions.push({ type: 'wireguard.add-peer', nodeId });
    }

    actions.push({ type: 'swarm.join', nodeIds: addedNodes });
    actions.push({ type: 'ceph.mount', nodeIds: addedNodes });

    for (const nodeId of addedNodes) {
      if (current.osdDevices[nodeId]) {
        actions.push({ type: 'ceph.osd-add', nodeId });
      }
    }
  }

  if (removedNodes.length > 0) {
    if (!options.allowNodeRemoval) {
      throw new Error(
        `Configuration removes node(s): ${removedNodes.join(', ')}. Re-run with --yes to apply node removal.`,
      );
    }

    for (const nodeId of removedNodes) {
      const hostname = previous.nodeHostnames?.[nodeId];

      if (hostname && (previous.osdDevices?.[nodeId] || previous.cephOsdNodes?.includes(nodeId))) {
        actions.push({ type: 'ceph.osd-remove', nodeId, hostname });
      }

      actions.push({ type: 'node.leave', nodeId });
      actions.push({ type: 'wireguard.remove-peer', nodeId });
    }
  }

  const addedVolumes = diffAdded(previous.volumes, current.volumes);

  if (addedVolumes.length > 0) {
    actions.push({ type: 'volume.create', volumeNames: addedVolumes });
  }

  const addedNetworks = diffAdded(previous.overlayNetworks, current.overlayNetworks);

  if (addedNetworks.length > 0) {
    actions.push({ type: 'swarm.network.create', networkNames: addedNetworks });
  }

  const traefikChanged =
    previous.traefikImage !== current.traefikImage ||
    previous.traefikMode !== current.traefikMode ||
    previous.traefikAcmeEnabled !== current.traefikAcmeEnabled ||
    (previous.traefikAcmeChallengeType ?? null) !== current.traefikAcmeChallengeType ||
    (previous.traefikAcmeDnsProvider ?? null) !== current.traefikAcmeDnsProvider;

  if (traefikChanged) {
    actions.push({ type: 'traefik.update' });
  }

  if (!previous.vipConfigured && current.vipConfigured) {
    actions.push({ type: 'vip.init' });
  }

  if (previous.vipConfigured && !current.vipConfigured) {
    actions.push({ type: 'vip.destroy' });
  }

  if (
    previous.vipConfigured &&
    current.vipConfigured &&
    vipStateChanged(previous.vipFingerprint, deriveVipStateSnapshot(config))
  ) {
    actions.push({ type: 'vip.reconcile' });
  } else if (previous.vipConfigured && current.vipConfigured && deriveVipStateSnapshot(config).hasSwarmBackends) {
    actions.push({ type: 'vip.reconcile' });
  }

  const previousRouting = {
    enabled: previous.routingEnabled,
    hubNodes: previous.routingHubNodes,
    localAsn: previous.routingLocalAsn,
    clusterCidr: previous.routingClusterCidr,
    exportWireguardSubnet: previous.routingExportWireguardSubnet,
    peers: previous.routingPeers,
  };

  if (!previousRouting.enabled && current.routing.enabled) {
    actions.push({ type: 'routing.init' });
  }

  if (previousRouting.enabled && !current.routing.enabled) {
    actions.push({ type: 'routing.destroy' });
  }

  if (previousRouting.enabled && current.routing.enabled && routingStateChanged(previousRouting, current.routing)) {
    actions.push({ type: 'routing.reconcile' });
  }

  const labelChangedNodes = diffSwarmLabelChanges(previous.swarmLabels, config).filter(
    (nodeId) => !addedNodes.includes(nodeId),
  );

  if (labelChangedNodes.length > 0) {
    actions.push({ type: 'swarm.reconcile-labels', nodeIds: labelChangedNodes });
  }

  const osdChangedNodes = diffOsdDeviceChanges(previous.osdDevices ?? {}, config).filter(
    (nodeId) => !addedNodes.includes(nodeId),
  );

  for (const nodeId of osdChangedNodes) {
    actions.push({ type: 'ceph.osd-add', nodeId });
  }

  return actions;
}
