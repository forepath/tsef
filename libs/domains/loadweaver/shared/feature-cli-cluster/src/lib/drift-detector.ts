import type { DriftFinding } from '@forepath/loadweaver/shared/util-cli-core';
import type { LoadweaverConfig } from '@forepath/loadweaver/shared/util-cli-core';

import type { RemoteFingerprint } from './remote-fingerprint';
import { deriveExpectedSwarmLabels, missingExpectedSwarmLabels } from '@forepath/loadweaver/shared/util-cli-core';

function expectedHostnames(config: LoadweaverConfig): string[] {
  return Object.values(config.nodes)
    .map((node) => node.hostname)
    .sort();
}

function expectedWireguardPeerCount(config: LoadweaverConfig): number {
  return Math.max(Object.keys(config.nodes).length - 1, 0);
}

function labelsSignature(labels: Record<string, string[]>): string {
  return Object.entries(labels)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([nodeId, pairs]) => `${nodeId}:${pairs.join(',')}`)
    .join('|');
}

export function detectRemoteDrift(
  baseline: RemoteFingerprint,
  current: RemoteFingerprint,
  config: LoadweaverConfig,
): DriftFinding[] {
  const drifts: DriftFinding[] = [];
  const expectedNodes = Object.keys(config.nodes).sort();
  const expectedPeers = expectedWireguardPeerCount(config);

  if (baseline.swarmNodeHostnames.join(',') !== current.swarmNodeHostnames.join(',')) {
    drifts.push({
      code: 'swarm.membership',
      message: `Swarm membership changed (${baseline.swarmNodeHostnames.length} -> ${current.swarmNodeHostnames.length} nodes): was [${baseline.swarmNodeHostnames.join(', ')}], now [${current.swarmNodeHostnames.join(', ')}]`,
    });
  }

  const expected = expectedHostnames(config);
  const unexpectedHostnames = current.swarmNodeHostnames.filter((hostname) => !expected.includes(hostname));

  if (unexpectedHostnames.length > 0) {
    drifts.push({
      code: 'swarm.unknown-hosts',
      message: `Swarm contains host(s) not present in loadweaver.yml: ${unexpectedHostnames.join(', ')}`,
    });
  }

  const baselineLabels = labelsSignature(baseline.swarmNodeLabels ?? {});
  const currentLabels = labelsSignature(current.swarmNodeLabels ?? {});

  if (baselineLabels !== currentLabels) {
    drifts.push({
      code: 'swarm.labels',
      message: 'Swarm node labels changed since last converge',
    });
  }

  for (const finding of missingExpectedSwarmLabels(deriveExpectedSwarmLabels(config), current.swarmNodeLabels ?? {})) {
    drifts.push({
      code: `swarm.labels.missing.${finding.nodeId}`,
      message: `Node ${finding.nodeId} is missing expected Swarm labels: ${finding.missing.join(', ')}`,
    });
  }

  if (baseline.cephHealth && current.cephHealth && baseline.cephHealth !== current.cephHealth) {
    drifts.push({
      code: 'ceph.health',
      message: `Ceph health changed (${baseline.cephHealth} -> ${current.cephHealth})`,
    });
  }

  if (baseline.cephMonitorCount !== current.cephMonitorCount) {
    drifts.push({
      code: 'ceph.monitors',
      message: `Ceph monitor count changed (${baseline.cephMonitorCount} -> ${current.cephMonitorCount})`,
    });
  }

  if (Boolean(config.vip) && baseline.vipHolderNodeId !== current.vipHolderNodeId) {
    drifts.push({
      code: 'vip.holder',
      message: `VIP holder changed (${baseline.vipHolderNodeId ?? 'none'} -> ${current.vipHolderNodeId ?? 'none'})`,
    });
  }

  const baselineHolders = baseline.vipHolders ?? {};
  const currentHolders = current.vipHolders ?? {};
  const holderAddresses = [...new Set([...Object.keys(baselineHolders), ...Object.keys(currentHolders)])].sort();

  for (const address of holderAddresses) {
    if ((baselineHolders[address] ?? null) !== (currentHolders[address] ?? null)) {
      drifts.push({
        code: `vip.holder.${address}`,
        message: `VIP ${address} holder changed (${baselineHolders[address] ?? 'none'} -> ${currentHolders[address] ?? 'none'})`,
      });
    }
  }

  if (baseline.traefikDeployed !== current.traefikDeployed) {
    drifts.push({
      code: 'traefik.presence',
      message: `Traefik stack presence changed (deployed=${baseline.traefikDeployed} -> ${current.traefikDeployed})`,
    });
  }

  if (baseline.traefikImage && current.traefikImage && baseline.traefikImage !== current.traefikImage) {
    drifts.push({
      code: 'traefik.image',
      message: `Traefik image changed (${baseline.traefikImage} -> ${current.traefikImage})`,
    });
  }

  if (
    baseline.traefikDeployed &&
    current.traefikDeployed &&
    baseline.traefikServiceVersion &&
    current.traefikServiceVersion &&
    baseline.traefikServiceVersion !== current.traefikServiceVersion
  ) {
    drifts.push({
      code: 'traefik.revision',
      message: `Traefik service revision changed (${baseline.traefikServiceVersion} -> ${current.traefikServiceVersion})`,
    });
  }

  if (baseline.traefikReplicas && current.traefikReplicas && baseline.traefikReplicas !== current.traefikReplicas) {
    drifts.push({
      code: 'traefik.replicas',
      message: `Traefik replica summary changed (${baseline.traefikReplicas} -> ${current.traefikReplicas})`,
    });
  }

  if (Boolean(config.vip) && baseline.vipKeepalivedActive !== current.vipKeepalivedActive) {
    drifts.push({
      code: 'vip.keepalived',
      message: `keepalived active state changed (${baseline.vipKeepalivedActive} -> ${current.vipKeepalivedActive})`,
    });
  }

  for (const nodeId of expectedNodes) {
    const before = baseline.nodes[nodeId];
    const after = current.nodes[nodeId];

    if (!before || !after) {
      continue;
    }

    if (before.wireguardActive && !after.wireguardActive) {
      drifts.push({
        code: `node.${nodeId}.wireguard`,
        message: `WireGuard on ${nodeId} was active at last converge but is inactive now`,
      });
    }

    if (after.wireguardActive && after.wireguardPeerCount !== expectedPeers) {
      drifts.push({
        code: `node.${nodeId}.wireguard-peer-count`,
        message: `WireGuard on ${nodeId} has ${after.wireguardPeerCount} peer(s); expected ${expectedPeers}`,
      });
    }

    if (before.wireguardActive && after.wireguardActive && before.wireguardPeerCount !== after.wireguardPeerCount) {
      drifts.push({
        code: `node.${nodeId}.wireguard-peer-change`,
        message: `WireGuard peer count on ${nodeId} changed (${before.wireguardPeerCount} -> ${after.wireguardPeerCount})`,
      });
    }

    if (before.swarmActive && !after.swarmActive) {
      drifts.push({
        code: `node.${nodeId}.swarm`,
        message: `Swarm on ${nodeId} was active at last converge but is inactive now`,
      });
    }

    if (before.cephMounted && !after.cephMounted) {
      drifts.push({
        code: `node.${nodeId}.cephfs`,
        message: `CephFS on ${nodeId} was mounted at last converge but is unmounted now`,
      });
    }

    if (!before.wireguardActive && after.wireguardActive) {
      drifts.push({
        code: `node.${nodeId}.wireguard-unmanaged`,
        message: `WireGuard on ${nodeId} is active but was inactive at last converge (possible manual change)`,
      });
    }

    if (!before.cephMounted && after.cephMounted) {
      drifts.push({
        code: `node.${nodeId}.cephfs-unmanaged`,
        message: `CephFS on ${nodeId} is mounted but was unmounted at last converge (possible manual change)`,
      });
    }
  }

  return drifts;
}
