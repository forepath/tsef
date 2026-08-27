import type { LoadweaverContext } from '@forepath/loadweaver/shared/util-cli-core';
import type { LoadweaverConfig } from '@forepath/loadweaver/shared/util-cli-core';
import { deriveVipStateSnapshot, isRoutingHub, printStructuredOutput } from '@forepath/loadweaver/shared/util-cli-core';

import {
  buildHostBootstrapScript,
  buildHostVerificationScript,
  parseOsRelease,
  type HostSoftwareRequirements,
} from './host-provision-script';

function nodeHasCephRole(config: LoadweaverConfig, nodeId: string): boolean {
  const roles = config.nodes[nodeId]?.roles ?? [];
  return roles.some((role) => role.startsWith('ceph-'));
}

function requirementsForNode(config: LoadweaverConfig, nodeId: string): HostSoftwareRequirements {
  const vip = deriveVipStateSnapshot(config);

  return {
    docker: true,
    wireguard: true,
    keepalived: vip.configured,
    haproxy: vip.hasListeners,
    bird: isRoutingHub(config, nodeId),
    cephadm: nodeHasCephRole(config, nodeId),
  };
}

export class HostService {
  constructor(private readonly ctx: LoadweaverContext) {}

  async bootstrapAll(): Promise<void> {
    for (const nodeId of Object.keys(this.requireConfig().nodes)) {
      await this.bootstrapNode(nodeId);
    }
  }

  async bootstrapNode(nodeId: string): Promise<void> {
    const config = this.requireConfig();

    if (!config.nodes[nodeId]) {
      throw new Error(`Unknown node: ${nodeId}`);
    }

    const os = await this.detectOs(nodeId);
    const vip = deriveVipStateSnapshot(config);
    const script = buildHostBootstrapScript(os, {
      installKeepalived: vip.configured,
      installHaproxy: vip.hasListeners,
      installBird: isRoutingHub(config, nodeId),
      installCephadm: nodeHasCephRole(config, nodeId),
      cephRelease: config.ceph.release,
      wireguardPort: config.wireguard.port,
      configureFirewall: config.host.configureFirewall,
      aptProxy: config.host.aptProxy,
      listenerPorts: vip.listenerPorts,
    });

    this.ctx.logger.info(`Bootstrapping host packages on ${nodeId} (${os.id} ${os.versionCodename})`);
    await this.ctx.sshForNode(nodeId).execRemote(script, { dryRun: this.ctx.options.dryRun });
  }

  async verifyAll(): Promise<void> {
    if (this.ctx.options.dryRun) {
      this.ctx.logger.warn('Skipping host software verification in dry-run mode');
      return;
    }

    const failures: string[] = [];

    for (const nodeId of Object.keys(this.requireConfig().nodes)) {
      const result = await this.verifyNode(nodeId);

      if (!result.passed) {
        failures.push(`${nodeId}: ${result.message}`);
      }
    }

    if (failures.length > 0) {
      throw new Error(`Host software verification failed:\n${failures.map((entry) => `- ${entry}`).join('\n')}`);
    }
  }

  async verifyNode(nodeId: string): Promise<{ passed: boolean; message: string }> {
    const config = this.requireConfig();
    const requirements = requirementsForNode(config, nodeId);
    const script = buildHostVerificationScript(requirements);
    const result = await this.ctx
      .sshForNode(nodeId)
      .execRemote(`${script} && echo ok || echo missing`, { dryRun: this.ctx.options.dryRun });

    if (result.stdout.trim() !== 'ok') {
      return {
        passed: false,
        message: `Missing required host software (docker, wireguard${requirements.keepalived ? ', keepalived' : ''}${requirements.haproxy ? ', haproxy' : ''}${requirements.cephadm ? ', cephadm' : ''})`,
      };
    }

    return { passed: true, message: 'Host software ready' };
  }

  async status(): Promise<void> {
    const nodes: Record<string, { passed: boolean; message: string }> = {};

    for (const nodeId of Object.keys(this.requireConfig().nodes)) {
      nodes[nodeId] = await this.verifyNode(nodeId);
    }

    if (this.ctx.options.json) {
      printStructuredOutput(this.ctx, { nodes });
      return;
    }

    for (const [nodeId, result] of Object.entries(nodes)) {
      this.ctx.logger.info(`${nodeId}: ${result.message}`);
    }
  }

  async bootstrapAndVerifyNode(nodeId: string): Promise<void> {
    await this.bootstrapNode(nodeId);
    const readiness = await this.verifyNode(nodeId);

    if (!readiness.passed && !this.ctx.options.dryRun) {
      throw new Error(`${nodeId}: ${readiness.message}`);
    }
  }

  private async detectOs(nodeId: string) {
    if (this.ctx.options.dryRun) {
      return { id: 'debian', versionCodename: 'bookworm' };
    }

    const result = await this.ctx
      .sshForNode(nodeId)
      .execRemote('cat /etc/os-release', { dryRun: this.ctx.options.dryRun });

    if (!result.stdout.trim()) {
      throw new Error(`Unable to read /etc/os-release from ${nodeId}`);
    }

    return parseOsRelease(result.stdout);
  }

  private requireConfig() {
    if (!this.ctx.config) {
      throw new Error('Configuration not loaded');
    }

    return this.ctx.config;
  }
}
