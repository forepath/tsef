import type { LoadweaverConfig } from '../config/schema';

export function isRoutingEnabled(config: LoadweaverConfig): boolean {
  return config.routing?.enabled === true;
}

export function resolveRoutingHubNodes(config: LoadweaverConfig): string[] {
  if (!isRoutingEnabled(config)) {
    return [];
  }

  if (config.routing?.hubNodes && config.routing.hubNodes.length > 0) {
    return [...config.routing.hubNodes].sort();
  }

  if (config.sites && config.sites.length > 0) {
    const hubs: string[] = [];

    for (const site of config.sites) {
      const manager = [...site.nodes].filter((nodeId) => config.nodes[nodeId]?.roles.includes('manager')).sort()[0];

      if (manager) {
        hubs.push(manager);
      }
    }

    if (hubs.length > 0) {
      return [...new Set(hubs)].sort();
    }
  }

  return Object.keys(config.nodes)
    .filter((nodeId) => config.nodes[nodeId].roles.includes('manager'))
    .sort();
}

export function isRoutingHub(config: LoadweaverConfig, nodeId: string): boolean {
  return resolveRoutingHubNodes(config).includes(nodeId);
}
