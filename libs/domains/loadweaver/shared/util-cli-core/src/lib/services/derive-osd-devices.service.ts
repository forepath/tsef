import type { LoadweaverConfig } from '../config/schema';

export function deriveOsdDevices(config: LoadweaverConfig): Record<string, string> {
  const devices: Record<string, string> = {};

  for (const [nodeId, node] of Object.entries(config.nodes)) {
    if (node.roles.includes('ceph-osd') && node.osdDevice) {
      devices[nodeId] = node.osdDevice;
    }
  }

  return devices;
}

export function diffOsdDeviceChanges(
  previousDevices: Record<string, string> | undefined,
  config: LoadweaverConfig,
): string[] {
  const current = deriveOsdDevices(config);
  const changed: string[] = [];

  for (const nodeId of Object.keys(current)) {
    if (previousDevices?.[nodeId] !== current[nodeId]) {
      changed.push(nodeId);
    }
  }

  return changed.sort();
}
