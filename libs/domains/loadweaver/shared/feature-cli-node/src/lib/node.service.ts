import type { LoadweaverContext } from '@forepath/loadweaver/shared/util-cli-core';

import { HostService } from '@forepath/loadweaver/shared/feature-cli-host';
import { CephService } from '@forepath/loadweaver/shared/feature-cli-ceph';
import { SwarmService } from '@forepath/loadweaver/shared/feature-cli-swarm';
import { VolumeService } from '@forepath/loadweaver/shared/feature-cli-volume';
import { WireguardService } from '@forepath/loadweaver/shared/feature-cli-wireguard';

export type NodeLeaveOptions = {
  hostname?: string;
  skipOsdRemoval?: boolean;
};

export class NodeService {
  constructor(private readonly ctx: LoadweaverContext) {}

  async join(nodeId: string): Promise<void> {
    const config = this.requireConfig();

    if (!config.nodes[nodeId]) {
      throw new Error(`Unknown node: ${nodeId}`);
    }

    const host = new HostService(this.ctx);
    const wireguard = new WireguardService(this.ctx);
    const swarm = new SwarmService(this.ctx);
    const ceph = new CephService(this.ctx);
    const volume = new VolumeService(this.ctx);

    await host.bootstrapAndVerifyNode(nodeId);
    await wireguard.addPeer(nodeId);
    await swarm.joinAll();
    await ceph.mountCephfsAll();
    await volume.createAll();
  }

  async leave(nodeId: string, options: NodeLeaveOptions = {}): Promise<void> {
    const config = this.requireConfig();
    const wireguard = new WireguardService(this.ctx);
    const ceph = new CephService(this.ctx);
    const node = config.nodes[nodeId];
    const hostname = options.hostname ?? node?.hostname;
    const hadOsd = Boolean(node?.osdDevice) || node?.roles.includes('ceph-osd');

    await this.ctx
      .sshForNode(nodeId)
      .execRemote('docker node update --availability drain $(hostname) || true', { dryRun: this.ctx.options.dryRun });

    if (!options.skipOsdRemoval && hadOsd && hostname) {
      await ceph.removeOsdsForNode(nodeId, hostname);
    }

    await this.ctx.sshForNode(nodeId).execRemote('docker swarm leave --force || true', {
      dryRun: this.ctx.options.dryRun,
    });

    await ceph.unmount(nodeId);
    await wireguard.removePeer(nodeId);
    await this.ctx.sshForNode(nodeId).execRemote('rm -f /etc/loadweaver/inventory.json /etc/loadweaver/lock.json', {
      dryRun: this.ctx.options.dryRun,
    });
  }

  async label(nodeId: string, label: string, value = 'true'): Promise<void> {
    const primary = this.requireConfig().cluster.primaryManager;
    await this.ctx
      .sshForNode(primary)
      .execRemote(`docker node update --label-add ${label}=${value} ${nodeId}`, { dryRun: this.ctx.options.dryRun });
  }

  private requireConfig() {
    if (!this.ctx.config) {
      throw new Error('Configuration not loaded');
    }

    return this.ctx.config;
  }
}
