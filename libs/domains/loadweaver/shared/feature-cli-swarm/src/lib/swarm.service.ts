import type { LoadweaverContext } from '@forepath/loadweaver/shared/util-cli-core';
import {
  assertRemoteSuccess,
  deriveExpectedSwarmLabels,
  isRemoteAlreadyExists,
  printStructuredOutput,
  staleManagedSwarmLabelKeys,
} from '@forepath/loadweaver/shared/util-cli-core';
import { getManagerNodes } from '@forepath/loadweaver/shared/util-cli-core';

export class SwarmService {
  constructor(private readonly ctx: LoadweaverContext) {}

  async init(): Promise<void> {
    const config = this.requireConfig();
    const primary = config.cluster.primaryManager;
    const advertise = config.nodes[primary].wireguardIp;

    const result = await this.ctx.sshForNode(primary).execRemote(`docker swarm init --advertise-addr ${advertise}`, {
      dryRun: this.ctx.options.dryRun,
    });

    if (result.exitCode !== 0 && !isRemoteAlreadyExists(result)) {
      const state = await this.ctx
        .sshForNode(primary)
        .execRemote(`docker info --format '{{.Swarm.LocalNodeState}}'`, { dryRun: this.ctx.options.dryRun });

      if (state.stdout.trim() !== 'active') {
        assertRemoteSuccess(result, `Swarm init on ${primary}`);
      }
    }
  }

  async joinAll(): Promise<void> {
    await this.joinNodes(Object.keys(this.requireConfig().nodes));
  }

  async joinNodes(nodeIds: string[]): Promise<void> {
    const config = this.requireConfig();
    const primary = config.cluster.primaryManager;
    const tokenResult = await this.ctx
      .sshForNode(primary)
      .execRemote('docker swarm join-token worker -q', { dryRun: this.ctx.options.dryRun });

    assertRemoteSuccess(tokenResult, 'Fetch Swarm worker token');
    const workerToken = tokenResult.stdout.trim();

    for (const nodeId of nodeIds) {
      if (nodeId === primary || !config.nodes[nodeId]) {
        continue;
      }

      const node = config.nodes[nodeId];
      const role = node.roles.includes('manager') ? 'manager' : 'worker';
      const token =
        role === 'manager'
          ? (
              await this.ctx.sshForNode(primary).execRemote('docker swarm join-token manager -q', {
                dryRun: this.ctx.options.dryRun,
              })
            ).stdout.trim()
          : workerToken;

      const joinResult = await this.ctx
        .sshForNode(nodeId)
        .execRemote(
          `docker swarm join --token ${token} ${config.nodes[primary].wireguardIp}:2377 --advertise-addr ${node.wireguardIp}`,
          { dryRun: this.ctx.options.dryRun },
        );

      if (joinResult.exitCode !== 0 && !isRemoteAlreadyExists(joinResult)) {
        assertRemoteSuccess(joinResult, `Swarm join on ${nodeId}`);
      }

      const state = await this.ctx
        .sshForNode(nodeId)
        .execRemote(`docker info --format '{{.Swarm.LocalNodeState}}'`, { dryRun: this.ctx.options.dryRun });

      if (!this.ctx.options.dryRun && state.stdout.trim() !== 'active') {
        throw new Error(`Swarm on ${nodeId} is not active after join attempt`);
      }
    }

    await this.reconcileLabels(nodeIds);
  }

  async reconcileLabels(nodeIds?: string[]): Promise<void> {
    const config = this.requireConfig();
    const primary = config.cluster.primaryManager;
    const expected = deriveExpectedSwarmLabels(config);
    const targets = nodeIds ?? Object.keys(config.nodes);

    for (const nodeId of targets) {
      const expectedLabels = expected[nodeId] ?? [];
      const actualLabels = this.ctx.options.dryRun ? [] : await this.fetchNodeLabels(primary, nodeId);
      const staleKeys = staleManagedSwarmLabelKeys(expectedLabels, actualLabels);

      for (const key of staleKeys) {
        this.ctx.logger.info(`Removing stale Swarm label ${key} from ${nodeId}`);
        const result = await this.ctx
          .sshForNode(primary)
          .execRemote(`docker node update --label-rm ${key} ${nodeId}`, { dryRun: this.ctx.options.dryRun });

        if (result.exitCode !== 0 && !isRemoteAlreadyExists(result)) {
          assertRemoteSuccess(result, `Remove stale Swarm label ${key} on ${nodeId}`);
        }
      }

      for (const label of expectedLabels) {
        const [key, value] = label.split('=');
        const result = await this.ctx
          .sshForNode(primary)
          .execRemote(`docker node update --label-add ${key}=${value} ${nodeId}`, { dryRun: this.ctx.options.dryRun });

        if (result.exitCode !== 0 && !isRemoteAlreadyExists(result)) {
          assertRemoteSuccess(result, `Apply Swarm label ${label} on ${nodeId}`);
        }
      }
    }
  }

  async applyExpectedLabels(nodeIds?: string[]): Promise<void> {
    await this.reconcileLabels(nodeIds);
  }

  private async fetchNodeLabels(primaryNodeId: string, nodeId: string): Promise<string[]> {
    const config = this.requireConfig();
    const node = config.nodes[nodeId];

    if (!node) {
      return [];
    }

    const listing = await this.ctx
      .sshForNode(primaryNodeId)
      .execRemote(`docker node ls --format '{{.Hostname}}\t{{.ID}}' 2>/dev/null || true`, {
        dryRun: this.ctx.options.dryRun,
      });

    let dockerNodeId: string | undefined;

    for (const line of listing.stdout
      .split('\n')
      .map((entry) => entry.trim())
      .filter(Boolean)) {
      const [hostname, id] = line.split('\t');

      if (hostname?.trim() === node.hostname) {
        dockerNodeId = id?.trim();
        break;
      }
    }

    if (!dockerNodeId) {
      return [];
    }

    const inspect = await this.ctx
      .sshForNode(primaryNodeId)
      .execRemote(
        `docker node inspect ${dockerNodeId} --format '{{range $k,$v := .Spec.Labels}}{{$k}}={{$v}}\n{{end}}' 2>/dev/null || true`,
        { dryRun: this.ctx.options.dryRun },
      );

    return inspect.stdout
      .split('\n')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  async createNetworks(networkNames?: string[]): Promise<void> {
    const config = this.requireConfig();
    const primary = config.cluster.primaryManager;
    const mtu = config.swarm.overlayMtu ? `--opt com.docker.network.driver.mtu=${config.swarm.overlayMtu}` : '';
    const targets = networkNames ?? config.swarm.overlayNetworks;

    for (const network of targets) {
      const result = await this.ctx
        .sshForNode(primary)
        .execRemote(`docker network create -d overlay ${mtu} ${network}`, { dryRun: this.ctx.options.dryRun });

      if (result.exitCode !== 0 && !isRemoteAlreadyExists(result)) {
        assertRemoteSuccess(result, `Create overlay network ${network}`);
      }
    }
  }

  async status(): Promise<void> {
    const snapshot = await this.inspectStatus();

    if (this.ctx.options.json) {
      printStructuredOutput(this.ctx, snapshot);
      return;
    }

    console.log(snapshot.nodesOutput);
    console.log(snapshot.networksOutput);
  }

  async inspectStatus(): Promise<{
    nodesOutput: string;
    networksOutput: string;
    nodesExitCode: number;
    networksExitCode: number;
  }> {
    const primary = this.requireConfig().cluster.primaryManager;
    const nodes = await this.ctx.sshForNode(primary).execRemote('docker node ls', { dryRun: this.ctx.options.dryRun });
    const networks = await this.ctx
      .sshForNode(primary)
      .execRemote('docker network ls', { dryRun: this.ctx.options.dryRun });

    return {
      nodesOutput: nodes.stdout,
      networksOutput: networks.stdout,
      nodesExitCode: nodes.exitCode,
      networksExitCode: networks.exitCode,
    };
  }

  async leaveAll(): Promise<void> {
    for (const nodeId of Object.keys(this.requireConfig().nodes)) {
      await this.ctx.sshForNode(nodeId).execRemote('docker swarm leave --force || true', {
        dryRun: this.ctx.options.dryRun,
      });
    }
  }

  private requireConfig() {
    if (!this.ctx.config) {
      throw new Error('Configuration not loaded');
    }

    return this.ctx.config;
  }
}

export { getManagerNodes };
