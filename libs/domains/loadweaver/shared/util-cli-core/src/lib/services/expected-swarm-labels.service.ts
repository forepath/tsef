import type { LoadweaverConfig } from '../config/schema';

import { isRoutingHub } from './resolve-routing-hubs.service';

export const MANAGED_SWARM_LABEL_PREFIX = 'loadweaver.';

export const LEGACY_SWARM_LABEL_KEYS = ['loadweaver.role', 'loadweaver.site'] as const;

export function roleSwarmLabel(role: string): string {
  return `loadweaver.role.${role}=true`;
}

export function routerSwarmLabel(): string {
  return roleSwarmLabel('router');
}

export function siteSwarmLabel(siteName: string): string {
  return `loadweaver.site.${siteName}=true`;
}

export function parseSwarmLabel(label: string): { key: string; value: string } {
  const separatorIndex = label.indexOf('=');

  if (separatorIndex === -1) {
    return { key: label, value: '' };
  }

  return {
    key: label.slice(0, separatorIndex),
    value: label.slice(separatorIndex + 1),
  };
}

export function groupExpectedLabelsByKey(labels: string[]): Record<string, Set<string>> {
  const grouped: Record<string, Set<string>> = {};

  for (const label of labels) {
    const { key, value } = parseSwarmLabel(label);
    grouped[key] ??= new Set();
    grouped[key].add(value);
  }

  return grouped;
}

export function staleManagedSwarmLabelKeys(expectedLabels: string[], actualLabels: string[]): string[] {
  const expectedByKey = groupExpectedLabelsByKey(expectedLabels);
  const staleKeys: string[] = [];

  for (const actualLabel of actualLabels) {
    const { key, value } = parseSwarmLabel(actualLabel);

    if (!key.startsWith(MANAGED_SWARM_LABEL_PREFIX)) {
      continue;
    }

    if (LEGACY_SWARM_LABEL_KEYS.includes(key as (typeof LEGACY_SWARM_LABEL_KEYS)[number])) {
      staleKeys.push(key);
      continue;
    }

    const expectedValues = expectedByKey[key];

    if (!expectedValues || !expectedValues.has(value)) {
      staleKeys.push(key);
    }
  }

  return [...new Set(staleKeys)];
}

export function deriveExpectedSwarmLabels(config: LoadweaverConfig): Record<string, string[]> {
  const labels: Record<string, string[]> = {};

  for (const nodeId of Object.keys(config.nodes)) {
    const nodeLabels = config.nodes[nodeId].roles.map((role) => roleSwarmLabel(role));

    for (const site of config.sites ?? []) {
      if (site.nodes.includes(nodeId)) {
        nodeLabels.push(siteSwarmLabel(site.name));
      }
    }

    if (isRoutingHub(config, nodeId)) {
      nodeLabels.push(routerSwarmLabel());
    }

    labels[nodeId] = nodeLabels.sort();
  }

  return labels;
}

export function missingExpectedSwarmLabels(
  expected: Record<string, string[]>,
  actual: Record<string, string[]>,
): Array<{ nodeId: string; missing: string[] }> {
  const findings: Array<{ nodeId: string; missing: string[] }> = [];

  for (const [nodeId, expectedLabels] of Object.entries(expected)) {
    const actualLabels = new Set(actual[nodeId] ?? []);
    const missing = expectedLabels.filter((label) => !actualLabels.has(label));

    if (missing.length > 0) {
      findings.push({ nodeId, missing });
    }
  }

  return findings;
}

export function diffSwarmLabelChanges(
  previousLabels: Record<string, string[]> | undefined,
  config: LoadweaverConfig,
): string[] {
  const current = deriveExpectedSwarmLabels(config);

  if (!previousLabels) {
    return Object.keys(config.nodes);
  }

  const changed: string[] = [];

  for (const nodeId of Object.keys(config.nodes)) {
    const previous = [...(previousLabels[nodeId] ?? [])].sort().join('\n');
    const next = [...(current[nodeId] ?? [])].sort().join('\n');

    if (previous !== next) {
      changed.push(nodeId);
    }
  }

  return changed;
}
