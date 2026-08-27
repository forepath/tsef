import type { LoadweaverContext } from '@forepath/loadweaver/shared/util-cli-core';
import { printStructuredOutput, resolveSshTarget } from '@forepath/loadweaver/shared/util-cli-core';

import { HostService } from '@forepath/loadweaver/shared/feature-cli-host';
import { CephService } from '@forepath/loadweaver/shared/feature-cli-ceph';
import { SwarmService } from '@forepath/loadweaver/shared/feature-cli-swarm';
import { TraefikService } from '@forepath/loadweaver/shared/feature-cli-traefik';
import { VipService } from '@forepath/loadweaver/shared/feature-cli-vip';
import { VolumeService } from '@forepath/loadweaver/shared/feature-cli-volume';
import { WireguardService } from '@forepath/loadweaver/shared/feature-cli-wireguard';

export class DiagService {
  constructor(private readonly ctx: LoadweaverContext) {}

  async runAll(): Promise<void> {
    await this.ping();
    await new HostService(this.ctx).status();
    await new WireguardService(this.ctx).status();
    await new SwarmService(this.ctx).status();
    await new CephService(this.ctx).status();
    await new VolumeService(this.ctx).list();
    await new TraefikService(this.ctx).status();

    if (this.ctx.config?.vip) {
      await new VipService(this.ctx).status();
    }
  }

  async ping(): Promise<void> {
    const config = this.requireConfig();
    const nodes = Object.entries(config.nodes);
    const results: Array<{ source: string; target: string; exitCode: number }> = [];

    for (const [sourceId, source] of nodes) {
      for (const [targetId, target] of nodes) {
        if (sourceId === targetId) {
          continue;
        }

        const result = await this.ctx
          .sshForNode(sourceId)
          .execRemote(`ping -c 1 -W 1 ${target.wireguardIp} || true`, { dryRun: this.ctx.options.dryRun });

        results.push({ source: sourceId, target: targetId, exitCode: result.exitCode });

        if (!this.ctx.options.json) {
          this.ctx.logger.info(`${source.hostname} -> ${targetId}: exit=${result.exitCode}`);
        }
      }
    }

    if (this.ctx.options.json) {
      printStructuredOutput(this.ctx, { ping: results });
    }
  }

  async ssh(nodeId: string): Promise<void> {
    const config = this.requireConfig();

    if (!config.nodes[nodeId]) {
      throw new Error(`Unknown node: ${nodeId}`);
    }

    const target = resolveSshTarget(config, nodeId);
    const host = new HostService(this.ctx);
    const readiness = await host.verifyNode(nodeId);
    const payload = {
      nodeId,
      target,
      hostReady: readiness.passed,
      message: readiness.message,
    };

    printStructuredOutput(this.ctx, payload);
  }

  private requireConfig() {
    if (!this.ctx.config) {
      throw new Error('Configuration not loaded');
    }

    return this.ctx.config;
  }
}
