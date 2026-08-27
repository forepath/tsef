import type { LoadweaverContext } from '@forepath/loadweaver/shared/util-cli-core';
import {
  assertRemoteSuccess,
  isRoutingEnabled,
  printStructuredOutput,
  resolveRoutingHubNodes,
} from '@forepath/loadweaver/shared/util-cli-core';

import { buildBirdConfig } from './bird-config.builder';
import {
  generateDryRunCrossWireguardKeyPair,
  loadCrossWireguardKeyStore,
  renderCrossWireguardConfig,
  renderCrossWireguardTeardown,
  saveCrossWireguardKeyStore,
  type CrossWireguardKeyStore,
} from './routing-cross-wg.service';

export class RoutingService {
  constructor(private readonly ctx: LoadweaverContext) {}

  async init(): Promise<void> {
    await this.reconcile();
  }

  async reconcile(): Promise<void> {
    const config = this.requireConfig();

    if (!isRoutingEnabled(config)) {
      throw new Error('Routing is not enabled in configuration');
    }

    const hubNodes = resolveRoutingHubNodes(config);
    const keys = await this.ensureCrossWireguardKeys(hubNodes);

    for (const hubNodeId of hubNodes) {
      await this.deployHubNode(hubNodeId, keys);
    }
  }

  async status(): Promise<void> {
    const hubs = await this.inspectStatus();

    if (this.ctx.options.json) {
      printStructuredOutput(this.ctx, { hubs });
      return;
    }

    for (const hub of hubs) {
      this.ctx.logger.info(`Routing status for ${hub.nodeId}`);
      if (hub.output) {
        console.log(hub.output);
      }
    }
  }

  async inspectStatus(): Promise<Array<{ nodeId: string; exitCode: number; output: string }>> {
    const config = this.requireConfig();
    const statuses: Array<{ nodeId: string; exitCode: number; output: string }> = [];

    if (!isRoutingEnabled(config)) {
      return statuses;
    }

    for (const hubNodeId of resolveRoutingHubNodes(config)) {
      const result = await this.ctx
        .sshForNode(hubNodeId)
        .execRemote('birdc show protocols all; echo "---"; birdc show route', {
          dryRun: this.ctx.options.dryRun,
        });

      statuses.push({
        nodeId: hubNodeId,
        exitCode: result.exitCode,
        output: result.stdout || result.stderr,
      });
    }

    return statuses;
  }

  async destroy(): Promise<void> {
    const config = this.requireConfig();

    if (!isRoutingEnabled(config)) {
      return;
    }

    const teardownCrossWg = renderCrossWireguardTeardown(config);

    for (const hubNodeId of resolveRoutingHubNodes(config)) {
      const commands = ['systemctl stop bird || true', 'systemctl disable bird || true', teardownCrossWg]
        .filter(Boolean)
        .join('\n');

      await this.ctx.sshForNode(hubNodeId).execRemote(commands, { dryRun: this.ctx.options.dryRun });
    }
  }

  private async deployHubNode(hubNodeId: string, keys: CrossWireguardKeyStore): Promise<void> {
    const config = this.requireConfig();
    const birdConfig = buildBirdConfig(config, hubNodeId);
    const crossWireguard = renderCrossWireguardConfig(config, hubNodeId, keys);

    this.ctx.logger.info(`Configure BIRD on routing hub ${hubNodeId}`);
    this.ctx.logger.debug(`BIRD config for ${hubNodeId}:\n${birdConfig}`);

    const commands = [
      crossWireguard,
      `cat > /etc/bird/bird.conf <<'EOF'\n${birdConfig}\nEOF`,
      'birdc configure || true',
      'systemctl enable bird',
      'systemctl restart bird',
      'birdc show protocols',
    ]
      .filter(Boolean)
      .join('\n');

    const result = await this.ctx.sshForNode(hubNodeId).execRemote(commands, { dryRun: this.ctx.options.dryRun });
    assertRemoteSuccess(result, `Configure BIRD on ${hubNodeId}`);
  }

  private async ensureCrossWireguardKeys(hubNodes: string[]): Promise<CrossWireguardKeyStore> {
    const config = this.requireConfig();
    const store = loadCrossWireguardKeyStore(this.ctx.options.configPath);
    let changed = false;

    for (const peer of config.routing?.peers ?? []) {
      if (!peer.wireguardPeer) {
        continue;
      }

      const iface = peer.wireguardPeer.interface ?? 'wg1';

      for (const hubNodeId of hubNodes) {
        store.nodes[hubNodeId] ??= {};

        if (store.nodes[hubNodeId][iface]) {
          continue;
        }

        if (this.ctx.options.dryRun) {
          store.nodes[hubNodeId][iface] = generateDryRunCrossWireguardKeyPair(hubNodeId, iface);
        } else {
          store.nodes[hubNodeId][iface] = await this.generateCrossWireguardKeyPair(hubNodeId);
        }

        changed = true;
      }
    }

    if (changed && !this.ctx.options.dryRun) {
      saveCrossWireguardKeyStore(this.ctx.options.configPath, store);
    }

    return store;
  }

  private async generateCrossWireguardKeyPair(nodeId: string): Promise<{ privateKey: string; publicKey: string }> {
    const privateResult = await this.ctx.sshForNode(nodeId).execRemote('wg genkey');

    if (privateResult.exitCode !== 0 || !privateResult.stdout.trim()) {
      throw new Error(`Failed to generate cross-cluster WireGuard private key on ${nodeId}`);
    }

    const privateKey = privateResult.stdout.trim();
    const publicResult = await this.ctx
      .sshForNode(nodeId)
      .execRemote(`printf '%s' '${privateKey.replace(/'/g, `'\\''`)}' | wg pubkey`);

    if (publicResult.exitCode !== 0 || !publicResult.stdout.trim()) {
      throw new Error(`Failed to derive cross-cluster WireGuard public key on ${nodeId}`);
    }

    return {
      privateKey,
      publicKey: publicResult.stdout.trim(),
    };
  }

  private requireConfig() {
    if (!this.ctx.config) {
      throw new Error('Configuration not loaded');
    }

    return this.ctx.config;
  }
}
