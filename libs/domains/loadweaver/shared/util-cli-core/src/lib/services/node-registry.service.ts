import type { LoadweaverConfig } from '../config/schema';

export function listNodeIds(config: LoadweaverConfig): string[] {
  return Object.keys(config.nodes);
}

export function getManagerNodes(config: LoadweaverConfig): string[] {
  return listNodeIds(config).filter((id) => config.nodes[id].roles.includes('manager'));
}

export function getNodesWithRole(config: LoadweaverConfig, role: string): string[] {
  return listNodeIds(config).filter((id) => config.nodes[id].roles.includes(role as never));
}

export function resolveNodeHost(config: LoadweaverConfig, nodeId: string): string {
  const node = config.nodes[nodeId];

  if (!node) {
    throw new Error(`Unknown node: ${nodeId}`);
  }

  return node.publicIp ?? node.privateIp ?? node.hostname;
}

export class NodeRegistry {
  constructor(private readonly config: LoadweaverConfig) {}

  list(): string[] {
    return listNodeIds(this.config);
  }

  managers(): string[] {
    return getManagerNodes(this.config);
  }

  withRole(role: string): string[] {
    return getNodesWithRole(this.config, role);
  }

  get(nodeId: string) {
    const node = this.config.nodes[nodeId];

    if (!node) {
      throw new Error(`Unknown node: ${nodeId}`);
    }

    return node;
  }

  primaryManager(): string {
    return this.config.cluster.primaryManager;
  }
}
