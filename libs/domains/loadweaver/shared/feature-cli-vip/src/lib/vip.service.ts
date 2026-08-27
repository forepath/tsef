import type { LoadweaverContext } from '@forepath/loadweaver/shared/util-cli-core';
import {
  assertRemoteSuccess,
  listVipAddresses,
  printStructuredOutput,
  resolveVipPools,
} from '@forepath/loadweaver/shared/util-cli-core';

import { poolsHaveListeners, resolvePoolFrontends } from './backend-resolution.service';
import { buildHaproxyConfig } from './haproxy-config.builder';
import { buildKeepalivedConfig } from './keepalived-config.builder';
import {
  assertKeepalivedActiveOnAllNodes,
  assertSingleVipHolder,
  inspectVipFromOutputs,
  type VipInspection,
} from './vip-inspection.service';

const FAILOVER_POLL_INTERVAL_MS = 2_000;
const FAILOVER_TIMEOUT_MS = 30_000;

export class VipService {
  constructor(private readonly ctx: LoadweaverContext) {}

  async init(): Promise<void> {
    await this.applyVipConfiguration();
    await this.assertConfiguredVipsHeld();
  }

  async reconcile(): Promise<void> {
    await this.applyVipConfiguration();
  }

  async status(): Promise<void> {
    const inspection = await this.inspectVip();

    if (this.ctx.options.json) {
      printStructuredOutput(this.ctx, inspection);
      return;
    }

    for (const address of inspection.addresses) {
      this.ctx.logger.info(
        `VIP ${address.address}: holder=${address.holderNodeId ?? 'none'} (${address.holderCount} node(s))`,
      );
    }

    for (const node of inspection.nodes) {
      this.ctx.logger.info(
        `Node ${node.nodeId}: keepalived=${node.keepalivedActive}, held=[${node.heldAddresses.join(', ')}]`,
      );
      if (node.output) {
        console.log(node.output);
      }
    }
  }

  async verifyFailover(options: { simulate: boolean; address?: string; pool?: string }): Promise<void> {
    const config = this.requireConfig();

    if (!config.vip) {
      throw new Error('VIP configuration is missing');
    }

    const targetAddress = this.resolveFailoverAddress(options);

    if (options.simulate && !this.ctx.options.yes && !this.ctx.options.dryRun) {
      throw new Error('VIP failover simulation requires --yes');
    }

    if (this.ctx.options.dryRun) {
      const payload = {
        ok: true,
        dryRun: true,
        mode: options.simulate ? 'simulate' : 'check-only',
        vipAddress: targetAddress,
        message: 'Dry-run VIP failover verification skipped live keepalived checks',
      };

      if (this.ctx.options.json) {
        printStructuredOutput(this.ctx, payload);
        return;
      }

      this.ctx.logger.info(payload.message);
      return;
    }

    const before = await this.inspectVip();
    assertSingleVipHolder(before, targetAddress);
    assertKeepalivedActiveOnAllNodes(before);

    if (!options.simulate) {
      if (this.ctx.options.json) {
        printStructuredOutput(this.ctx, {
          ok: true,
          mode: 'check-only',
          inspection: before,
          vipAddress: targetAddress,
        });
        return;
      }

      const holder =
        before.addresses.find((entry) => entry.address === targetAddress)?.holderNodeId ?? before.holderNodeId;
      this.ctx.logger.info(`VIP ${targetAddress} held by ${holder}`);
      return;
    }

    const originalHolder =
      before.addresses.find((entry) => entry.address === targetAddress)?.holderNodeId ?? before.holderNodeId;

    if (!originalHolder) {
      throw new Error(`VIP ${targetAddress} has no holder`);
    }

    await this.ctx
      .sshForNode(originalHolder)
      .execRemote('systemctl stop keepalived', { dryRun: this.ctx.options.dryRun });

    const after = await this.waitForVipFailover(originalHolder, targetAddress);
    assertSingleVipHolder(after, targetAddress);

    const failoverHolder = after.addresses.find((entry) => entry.address === targetAddress)?.holderNodeId;

    if (failoverHolder === originalHolder) {
      throw new Error(`VIP ${targetAddress} did not fail over from ${originalHolder} within ${FAILOVER_TIMEOUT_MS}ms`);
    }

    await this.ctx
      .sshForNode(originalHolder)
      .execRemote('systemctl start keepalived', { dryRun: this.ctx.options.dryRun });

    const restored = await this.inspectVip();

    if (this.ctx.options.json) {
      printStructuredOutput(this.ctx, {
        ok: true,
        mode: 'simulate',
        vipAddress: targetAddress,
        originalHolder,
        failoverHolder,
        restoredHolder: restored.addresses.find((entry) => entry.address === targetAddress)?.holderNodeId ?? null,
      });
      return;
    }

    this.ctx.logger.info(`VIP ${targetAddress} failed over from ${originalHolder} to ${failoverHolder}`);
  }

  async inspectVip(): Promise<VipInspection> {
    const config = this.requireConfig();

    if (!config.vip) {
      throw new Error('VIP configuration is missing');
    }

    const addresses = listVipAddresses(config);
    const nodeOutputs: Array<{ nodeId: string; output: string }> = [];

    for (const nodeId of Object.keys(config.nodes)) {
      const result = await this.ctx
        .sshForNode(nodeId)
        .execRemote('ip -4 addr show && systemctl is-active keepalived || true', {
          dryRun: this.ctx.options.dryRun,
        });

      nodeOutputs.push({
        nodeId,
        output: result.stdout || result.stderr,
      });
    }

    return inspectVipFromOutputs(addresses, nodeOutputs);
  }

  async inspectStatus(): Promise<Array<{ nodeId: string; exitCode: number; output: string }>> {
    const inspection = await this.inspectVip();

    return inspection.nodes.map((node) => ({
      nodeId: node.nodeId,
      exitCode: 0,
      output: node.output,
    }));
  }

  async destroy(): Promise<void> {
    for (const nodeId of Object.keys(this.requireConfig().nodes)) {
      await this.ctx
        .sshForNode(nodeId)
        .execRemote(
          'systemctl stop keepalived || true; systemctl disable keepalived || true; rm -f /etc/keepalived/keepalived.conf; systemctl stop haproxy || true; systemctl disable haproxy || true; rm -f /etc/haproxy/haproxy.cfg',
          { dryRun: this.ctx.options.dryRun },
        );
    }
  }

  private async applyVipConfiguration(): Promise<void> {
    const config = this.requireConfig();

    if (!config.vip) {
      throw new Error('VIP configuration is missing');
    }

    const nodes = Object.keys(config.nodes);
    const pools = resolveVipPools(config);
    const frontends = await resolvePoolFrontends(this.ctx, config);
    const haproxyConfig = frontends.length > 0 ? buildHaproxyConfig(frontends) : null;

    for (let index = 0; index < nodes.length; index++) {
      const nodeId = nodes[index];
      const priority = 100 - index * 10;
      const keepalived = buildKeepalivedConfig(config, priority);

      const keepalivedResult = await this.ctx
        .sshForNode(nodeId)
        .execRemote(
          `mkdir -p /etc/keepalived && cat > /etc/keepalived/keepalived.conf <<'EOF'\n${keepalived}EOF\nsystemctl enable keepalived && systemctl restart keepalived`,
          { dryRun: this.ctx.options.dryRun },
        );
      assertRemoteSuccess(keepalivedResult, `Configure keepalived on ${nodeId}`);

      if (haproxyConfig) {
        const haproxyResult = await this.ctx
          .sshForNode(nodeId)
          .execRemote(
            `mkdir -p /etc/haproxy && cat > /etc/haproxy/haproxy.cfg <<'EOF'\n${haproxyConfig}EOF\nsystemctl enable haproxy && systemctl restart haproxy`,
            { dryRun: this.ctx.options.dryRun },
          );
        assertRemoteSuccess(haproxyResult, `Configure haproxy on ${nodeId}`);
      } else if (!poolsHaveListeners(pools)) {
        await this.ctx
          .sshForNode(nodeId)
          .execRemote('systemctl stop haproxy || true; systemctl disable haproxy || true', {
            dryRun: this.ctx.options.dryRun,
          });
      }
    }
  }

  private resolveFailoverAddress(options: { address?: string; pool?: string }): string {
    const config = this.requireConfig();
    const addresses = listVipAddresses(config);

    if (options.pool) {
      const pool = (config.vip?.pools ?? []).find((entry) => entry.name === options.pool);

      if (!pool) {
        throw new Error(`Unknown vip pool: ${options.pool}`);
      }

      return pool.address;
    }

    if (options.address) {
      if (!addresses.includes(options.address)) {
        throw new Error(`Unknown vip address: ${options.address}`);
      }

      return options.address;
    }

    if (config.vip?.address) {
      return config.vip.address;
    }

    if (addresses.length === 0) {
      throw new Error('No VIP addresses configured');
    }

    return addresses[0];
  }

  private async waitForVipFailover(previousHolder: string, address: string): Promise<VipInspection> {
    if (this.ctx.options.dryRun) {
      const inspection = await this.inspectVip();
      return {
        ...inspection,
        holderNodeId: inspection.nodes.find((node) => node.nodeId !== previousHolder)?.nodeId ?? null,
        holderCount: 1,
        addresses: inspection.addresses.map((entry) =>
          entry.address === address
            ? {
                ...entry,
                holderNodeId: inspection.nodes.find((node) => node.nodeId !== previousHolder)?.nodeId ?? null,
                holderCount: 1,
              }
            : entry,
        ),
      };
    }

    const deadline = Date.now() + FAILOVER_TIMEOUT_MS;

    while (Date.now() < deadline) {
      const inspection = await this.inspectVip();
      const target = inspection.addresses.find((entry) => entry.address === address);

      if (target && target.holderCount === 1 && target.holderNodeId !== previousHolder) {
        return inspection;
      }

      await new Promise((resolve) => setTimeout(resolve, FAILOVER_POLL_INTERVAL_MS));
    }

    return this.inspectVip();
  }

  private async assertConfiguredVipsHeld(): Promise<void> {
    if (this.ctx.options.dryRun || !this.requireConfig().vip) {
      return;
    }

    const inspection = await this.inspectVip();

    for (const address of inspection.addresses) {
      assertSingleVipHolder(inspection, address.address);
    }
  }

  private requireConfig() {
    if (!this.ctx.config) {
      throw new Error('Configuration not loaded');
    }

    return this.ctx.config;
  }
}
