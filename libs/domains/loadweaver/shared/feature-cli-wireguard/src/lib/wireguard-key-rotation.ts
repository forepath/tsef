import type { LoadweaverConfig } from '@forepath/loadweaver/shared/util-cli-core';

import type { WireguardKeyStore } from './wireguard-key-store';

export interface WireguardKeyRotationPolicy {
  enabled: boolean;
  intervalDays: number;
  warnBeforeDays: number;
}

export type NodeKeyRotationStatusKind = 'ok' | 'warning' | 'due' | 'missing';

export interface NodeKeyRotationStatus {
  nodeId: string;
  rotatedAt?: string;
  ageDays: number | null;
  status: NodeKeyRotationStatusKind;
  dueAt?: string;
}

export interface KeyRotationEvaluation {
  policy: WireguardKeyRotationPolicy;
  nodes: NodeKeyRotationStatus[];
  dueNodeIds: string[];
  warningNodeIds: string[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function resolveKeyRotationPolicy(config: LoadweaverConfig): WireguardKeyRotationPolicy {
  const rotation = config.wireguard.keyRotation;

  return {
    enabled: rotation.enabled,
    intervalDays: rotation.intervalDays,
    warnBeforeDays: rotation.warnBeforeDays,
  };
}

export function evaluateKeyRotation(
  config: LoadweaverConfig,
  store: WireguardKeyStore,
  referenceDate: Date = new Date(),
): KeyRotationEvaluation {
  const policy = resolveKeyRotationPolicy(config);
  const nodeIds = Object.keys(config.nodes);
  const nodes: NodeKeyRotationStatus[] = [];
  const dueNodeIds: string[] = [];
  const warningNodeIds: string[] = [];

  for (const nodeId of nodeIds) {
    const record = store.nodes[nodeId];
    const status = evaluateNodeKeyRotation(nodeId, record?.rotatedAt, policy, referenceDate);
    nodes.push(status);

    if (status.status === 'due') {
      dueNodeIds.push(nodeId);
    } else if (status.status === 'warning') {
      warningNodeIds.push(nodeId);
    }
  }

  return { policy, nodes, dueNodeIds, warningNodeIds };
}

function evaluateNodeKeyRotation(
  nodeId: string,
  rotatedAt: string | undefined,
  policy: WireguardKeyRotationPolicy,
  referenceDate: Date,
): NodeKeyRotationStatus {
  if (!rotatedAt) {
    return {
      nodeId,
      rotatedAt,
      ageDays: null,
      status: policy.enabled ? 'due' : 'missing',
    };
  }

  const rotatedAtMs = Date.parse(rotatedAt);

  if (Number.isNaN(rotatedAtMs)) {
    return {
      nodeId,
      rotatedAt,
      ageDays: null,
      status: policy.enabled ? 'due' : 'missing',
    };
  }

  const ageDays = Math.floor((referenceDate.getTime() - rotatedAtMs) / MS_PER_DAY);
  const dueAt = new Date(rotatedAtMs + policy.intervalDays * MS_PER_DAY).toISOString();
  const warningStartsAt = policy.intervalDays - policy.warnBeforeDays;

  if (!policy.enabled) {
    return { nodeId, rotatedAt, ageDays, status: 'ok', dueAt };
  }

  if (ageDays >= policy.intervalDays) {
    return { nodeId, rotatedAt, ageDays, status: 'due', dueAt };
  }

  if (ageDays >= warningStartsAt) {
    return { nodeId, rotatedAt, ageDays, status: 'warning', dueAt };
  }

  return { nodeId, rotatedAt, ageDays, status: 'ok', dueAt };
}

export type RotationStatusExitCode = 0 | 1 | 2;

export function resolveRotationStatusExitCode(evaluation: KeyRotationEvaluation): RotationStatusExitCode {
  if (!evaluation.policy.enabled) {
    return 0;
  }

  if (evaluation.dueNodeIds.length > 0) {
    return 1;
  }

  if (evaluation.warningNodeIds.length > 0) {
    return 2;
  }

  return 0;
}

export function formatRotationScheduleHint(configPath: string, policy: WireguardKeyRotationPolicy): string {
  const configArg = `--config ${configPath}`;

  return [
    '# Suggested automation for WireGuard key rotation',
    '# Run daily; rotates only when keys exceed wireguard.keyRotation.intervalDays',
    '',
    '## cron',
    `0 3 * * * root loadweaver ${configArg} --yes wireguard rotate-if-due`,
    '',
    '## systemd timer (loadweaver-wireguard-rotate.service)',
    '[Unit]',
    'Description=Loadweaver WireGuard key rotation',
    '',
    '[Service]',
    'Type=oneshot',
    `ExecStart=/usr/local/bin/loadweaver ${configArg} --yes wireguard rotate-if-due`,
    '',
    '## systemd timer (loadweaver-wireguard-rotate.timer)',
    '[Unit]',
    'Description=Daily Loadweaver WireGuard key rotation check',
    '',
    '[Timer]',
    'OnCalendar=daily',
    'Persistent=true',
    '',
    '[Install]',
    'WantedBy=timers.target',
    '',
    `Policy: enabled=${policy.enabled}, intervalDays=${policy.intervalDays}, warnBeforeDays=${policy.warnBeforeDays}`,
  ].join('\n');
}
