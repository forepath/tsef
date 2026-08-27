import type { LoadweaverContext } from '@forepath/loadweaver/shared/util-cli-core';
import { printStructuredOutput, renderTemplate } from '@forepath/loadweaver/shared/util-cli-core';

import {
  ensureWireguardKeys,
  generateDryRunWireguardKeyPair,
  loadWireguardKeyStore,
  removeWireguardKeys,
  rotateWireguardKeys,
  clearWireguardKeyStore,
  type WireguardKeyGenerator,
  type WireguardKeyStore,
} from './wireguard-key-store';
import {
  evaluateKeyRotation,
  formatRotationScheduleHint,
  resolveKeyRotationPolicy,
  resolveRotationStatusExitCode,
  type KeyRotationEvaluation,
} from './wireguard-key-rotation';
import { WG0_CONF_TEMPLATE } from './templates';

export class WireguardService {
  constructor(private readonly ctx: LoadweaverContext) {}

  async init(): Promise<void> {
    const config = this.requireConfig();
    this.ctx.logger.info('Initializing WireGuard mesh');

    const keys = await ensureWireguardKeys(
      this.ctx.options.configPath,
      Object.keys(config.nodes),
      this.keyGenerator(),
      this.ctx.options.dryRun,
    );

    for (const nodeId of Object.keys(config.nodes)) {
      await this.deployNodeConfig(nodeId, keys, false);
    }
  }

  async reconcile(): Promise<void> {
    await this.init();
  }

  async addPeer(nodeId: string): Promise<void> {
    const config = this.requireConfig();

    if (!config.nodes[nodeId]) {
      throw new Error(`Unknown node: ${nodeId}`);
    }

    this.ctx.logger.info(`Adding WireGuard peer ${nodeId} (${config.nodes[nodeId].wireguardIp})`);

    const keys = await ensureWireguardKeys(
      this.ctx.options.configPath,
      Object.keys(config.nodes),
      this.keyGenerator(),
      this.ctx.options.dryRun,
    );

    for (const peerId of Object.keys(config.nodes)) {
      await this.deployNodeConfig(peerId, keys, peerId !== nodeId);
    }
  }

  async removePeer(nodeId: string): Promise<void> {
    const config = this.requireConfig();
    this.ctx.logger.info(`Removing WireGuard peer ${nodeId}`);

    await this.ctx
      .sshForNode(nodeId)
      .execRemote(`wg-quick down ${config.wireguard.interface} || true`, { dryRun: this.ctx.options.dryRun });

    if (!this.ctx.options.dryRun) {
      removeWireguardKeys(this.ctx.options.configPath, [nodeId]);
    }

    const keys = loadWireguardKeyStore(this.ctx.options.configPath);
    const remainingNodeIds = Object.keys(config.nodes).filter((id) => id !== nodeId);

    for (const peerId of remainingNodeIds) {
      await this.deployNodeConfig(peerId, keys, true);
    }
  }

  async rotateKeys(nodeId?: string): Promise<void> {
    const config = this.requireConfig();
    const targetNodeIds = nodeId ? [nodeId] : Object.keys(config.nodes);

    if (nodeId && !config.nodes[nodeId]) {
      throw new Error(`Unknown node: ${nodeId}`);
    }

    this.ctx.logger.info(
      nodeId ? `Rotating WireGuard keys for ${nodeId}` : 'Rotating WireGuard keys for all cluster nodes',
    );

    await this.rotateNodeKeys(targetNodeIds);
  }

  evaluateRotation(referenceDate?: Date): KeyRotationEvaluation {
    const config = this.requireConfig();
    const store = loadWireguardKeyStore(this.ctx.options.configPath);

    return evaluateKeyRotation(config, store, referenceDate);
  }

  async rotationStatus(): Promise<number> {
    const evaluation = this.evaluateRotation();
    const exitCode = resolveRotationStatusExitCode(evaluation);
    const payload = {
      policy: evaluation.policy,
      nodes: evaluation.nodes,
      dueNodeIds: evaluation.dueNodeIds,
      warningNodeIds: evaluation.warningNodeIds,
      exitCode,
    };

    if (this.ctx.options.json) {
      printStructuredOutput(this.ctx, payload);
      return exitCode;
    }

    if (!evaluation.policy.enabled) {
      this.ctx.logger.info('WireGuard key rotation schedule is disabled (wireguard.keyRotation.enabled: false)');
    }

    for (const node of evaluation.nodes) {
      const rotatedAt = node.rotatedAt ?? 'never';
      const age = node.ageDays === null ? 'unknown' : `${node.ageDays}d`;
      this.ctx.logger.info(`${node.nodeId}: status=${node.status} age=${age} rotatedAt=${rotatedAt}`);
    }

    if (evaluation.dueNodeIds.length > 0) {
      this.ctx.logger.warn(`Keys due for rotation: ${evaluation.dueNodeIds.join(', ')}`);
    }

    if (evaluation.warningNodeIds.length > 0) {
      this.ctx.logger.warn(`Keys approaching rotation: ${evaluation.warningNodeIds.join(', ')}`);
    }

    return exitCode;
  }

  async rotateIfDue(): Promise<string[]> {
    const evaluation = this.evaluateRotation();

    if (!evaluation.policy.enabled) {
      this.ctx.logger.info('WireGuard key rotation schedule is disabled; skipping rotate-if-due');
      return [];
    }

    if (evaluation.dueNodeIds.length === 0) {
      this.ctx.logger.info('No WireGuard keys are due for rotation');
      return [];
    }

    this.ctx.logger.info(`Rotating due WireGuard keys: ${evaluation.dueNodeIds.join(', ')}`);
    await this.rotateNodeKeys(evaluation.dueNodeIds);

    return evaluation.dueNodeIds;
  }

  rotationScheduleHint(): void {
    const config = this.requireConfig();
    const policy = resolveKeyRotationPolicy(config);
    const hint = formatRotationScheduleHint(this.ctx.options.configPath, policy);

    if (this.ctx.options.json) {
      printStructuredOutput(this.ctx, {
        policy,
        cron: `0 3 * * * root loadweaver --config ${this.ctx.options.configPath} --yes wireguard rotate-if-due`,
        hint,
      });
      return;
    }

    console.log(hint);
  }

  private async rotateNodeKeys(targetNodeIds: string[]): Promise<void> {
    const config = this.requireConfig();

    const keys = await rotateWireguardKeys(
      this.ctx.options.configPath,
      targetNodeIds,
      this.keyGenerator(),
      this.ctx.options.dryRun,
    );

    for (const peerId of Object.keys(config.nodes)) {
      await this.deployNodeConfig(peerId, keys, true);
    }
  }

  async status(): Promise<void> {
    const nodes = await this.inspectStatus();

    if (this.ctx.options.json) {
      printStructuredOutput(this.ctx, { nodes });
      return;
    }

    for (const node of nodes) {
      this.ctx.logger.info(`${node.nodeId}: exit=${node.exitCode}`);
      if (node.output) {
        console.log(node.output);
      }
    }
  }

  async inspectStatus(): Promise<Array<{ nodeId: string; exitCode: number; output: string }>> {
    const config = this.requireConfig();
    const statuses: Array<{ nodeId: string; exitCode: number; output: string }> = [];

    for (const nodeId of Object.keys(config.nodes)) {
      const result = await this.ctx
        .sshForNode(nodeId)
        .execRemote(`wg show ${config.wireguard.interface}`, { dryRun: this.ctx.options.dryRun });

      statuses.push({
        nodeId,
        exitCode: result.exitCode,
        output: result.stdout || result.stderr,
      });
    }

    return statuses;
  }

  async teardown(): Promise<void> {
    const config = this.requireConfig();

    for (const nodeId of Object.keys(config.nodes)) {
      await this.ctx
        .sshForNode(nodeId)
        .execRemote(`wg-quick down ${config.wireguard.interface} || true`, { dryRun: this.ctx.options.dryRun });
    }
  }

  async teardownAndClearKeys(): Promise<void> {
    await this.teardown();

    if (!this.ctx.options.dryRun) {
      clearWireguardKeyStore(this.ctx.options.configPath);
    }
  }

  private async deployNodeConfig(nodeId: string, keys: WireguardKeyStore, rollingReload: boolean): Promise<void> {
    const config = this.requireConfig();
    const rendered = this.renderConfig(nodeId, keys);
    const iface = config.wireguard.interface;
    const confPath = `/etc/wireguard/${iface}.conf`;

    this.ctx.logger.info(`Configure ${iface} on ${nodeId}`);

    const writeConfig = `install -d -m 700 /etc/wireguard && cat > ${confPath} <<'EOF'\n${rendered}\nEOF\nchmod 600 ${confPath}`;
    const bringUp = rollingReload
      ? `wg syncconf ${iface} <(wg-quick strip ${iface}) || wg-quick up ${iface}`
      : `wg-quick up ${iface} || wg show ${iface} || true`;

    await this.ctx.sshForNode(nodeId).execRemote(`${writeConfig}\n${bringUp}`, {
      dryRun: this.ctx.options.dryRun,
    });
  }

  private renderConfig(localNodeId: string, keys: WireguardKeyStore): string {
    const config = this.requireConfig();
    const localKeys = keys.nodes[localNodeId];

    if (!localKeys) {
      throw new Error(`Missing WireGuard keys for node: ${localNodeId}`);
    }

    return renderTemplate(WG0_CONF_TEMPLATE, {
      address: config.nodes[localNodeId].wireguardIp,
      port: config.wireguard.port,
      mtu: config.wireguard.mtu,
      privateKey: localKeys.privateKey,
      peers: this.renderPeerBlocks(localNodeId, keys),
    });
  }

  private renderPeerBlocks(localNodeId: string, keys: WireguardKeyStore): string {
    const config = this.requireConfig();

    return Object.entries(config.nodes)
      .filter(([nodeId]) => nodeId !== localNodeId)
      .map(([nodeId, peer]) => {
        const peerKeys = keys.nodes[nodeId];

        if (!peerKeys) {
          throw new Error(`Missing WireGuard public key for peer node: ${nodeId}`);
        }

        const endpoint = peer.wireguardEndpoint ?? peer.publicIp ?? peer.hostname;
        return `[Peer]
PublicKey = ${peerKeys.publicKey}
AllowedIPs = ${peer.wireguardIp}/32
Endpoint = ${endpoint}:${config.wireguard.port}
PersistentKeepalive = 25`;
      })
      .join('\n\n');
  }

  private keyGenerator(): WireguardKeyGenerator {
    return async (nodeId: string) => {
      if (this.ctx.options.dryRun) {
        return generateDryRunWireguardKeyPair(nodeId);
      }

      const privateResult = await this.ctx.sshForNode(nodeId).execRemote('wg genkey');

      if (privateResult.exitCode !== 0 || !privateResult.stdout.trim()) {
        throw new Error(`Failed to generate WireGuard private key on ${nodeId}. Run loadweaver host bootstrap first.`);
      }

      const privateKey = privateResult.stdout.trim();
      const publicResult = await this.ctx
        .sshForNode(nodeId)
        .execRemote(`printf '%s' '${privateKey.replace(/'/g, `'\\''`)}' | wg pubkey`);

      if (publicResult.exitCode !== 0 || !publicResult.stdout.trim()) {
        throw new Error(`Failed to derive WireGuard public key on ${nodeId}.`);
      }

      return {
        privateKey,
        publicKey: publicResult.stdout.trim(),
      };
    };
  }

  private requireConfig() {
    if (!this.ctx.config) {
      throw new Error('Configuration not loaded');
    }

    return this.ctx.config;
  }
}
