import * as fs from 'node:fs';

import type { LoadweaverContext } from '@forepath/loadweaver/shared/util-cli-core';
import {
  assertPrerequisites,
  printStructuredOutput,
  runPrerequisiteChecks,
} from '@forepath/loadweaver/shared/util-cli-core';

import { CephService } from '@forepath/loadweaver/shared/feature-cli-ceph';
import { HostService } from '@forepath/loadweaver/shared/feature-cli-host';
import { NodeService } from '@forepath/loadweaver/shared/feature-cli-node';
import { SwarmService } from '@forepath/loadweaver/shared/feature-cli-swarm';
import { TraefikService } from '@forepath/loadweaver/shared/feature-cli-traefik';
import { VipService } from '@forepath/loadweaver/shared/feature-cli-vip';
import { RoutingService } from '@forepath/loadweaver/shared/feature-cli-routing';
import { VolumeService } from '@forepath/loadweaver/shared/feature-cli-volume';
import { WireguardService } from '@forepath/loadweaver/shared/feature-cli-wireguard';

import { planClusterUpdate, type UpdateAction } from './cluster-update-planner';
import { defaultStatePath, loadClusterState, type ClusterState } from './cluster-state';
import { runGuardedMutation } from '@forepath/loadweaver/shared/util-cli-core';
import { removeHostInventories } from './node-inventory.service';

export type OrchestratorStep = {
  name: string;
  run: () => Promise<void>;
};

type ClusterStatusSnapshot = {
  prerequisites: Awaited<ReturnType<typeof runPrerequisiteChecks>>;
  wireguard: { nodes: Array<{ nodeId: string; exitCode: number; output: string }> };
  swarm: { nodesOutput: string; networksOutput: string; nodesExitCode: number; networksExitCode: number };
  ceph: { exitCode: number; output: string };
  traefik: { exitCode: number; output: string };
  vip?: { nodes: Array<{ nodeId: string; exitCode: number; output: string }> };
  routing?: { hubs: Array<{ nodeId: string; exitCode: number; output: string }> };
};

export class ClusterOrchestrator {
  constructor(private readonly ctx: LoadweaverContext) {}

  initSteps(): OrchestratorStep[] {
    const wireguard = new WireguardService(this.ctx);
    const swarm = new SwarmService(this.ctx);
    const ceph = new CephService(this.ctx);
    const volume = new VolumeService(this.ctx);
    const traefik = new TraefikService(this.ctx);
    const vip = new VipService(this.ctx);
    const routing = new RoutingService(this.ctx);

    const steps: OrchestratorStep[] = [
      { name: 'host.bootstrap', run: () => new HostService(this.ctx).bootstrapAll() },
      {
        name: 'prerequisites',
        run: async () => {
          assertPrerequisites(await runPrerequisiteChecks(this.ctx));
          await new HostService(this.ctx).verifyAll();
        },
      },
      { name: 'wireguard.init', run: () => wireguard.init() },
    ];

    if (this.ctx.config?.routing?.enabled) {
      steps.push({ name: 'routing.init', run: () => routing.init() });
    }

    steps.push(
      { name: 'swarm.init', run: () => swarm.init() },
      { name: 'swarm.join', run: () => swarm.joinAll() },
      { name: 'ceph.init', run: () => ceph.init() },
      { name: 'ceph.cephfs-create', run: () => ceph.createCephfs() },
      { name: 'ceph.cephfs-mount', run: () => ceph.mountCephfsAll() },
      { name: 'volume.create', run: () => volume.createAll() },
      { name: 'swarm.network.create', run: () => swarm.createNetworks() },
      { name: 'traefik.deploy', run: () => traefik.deploy() },
    );

    if (this.ctx.config?.vip) {
      steps.push({ name: 'vip.init', run: () => vip.init() });
    }

    return steps;
  }

  updateSteps(previous: ClusterState | undefined): OrchestratorStep[] {
    if (!previous) {
      return this.initSteps();
    }

    if (!this.ctx.config) {
      throw new Error('Configuration not loaded');
    }

    const actions = planClusterUpdate(previous, this.ctx.config, {
      allowNodeRemoval: this.ctx.options.yes || this.ctx.options.dryRun,
    });

    if (actions.length === 0 && !this.shouldRotateWireguardKeys()) {
      return [{ name: 'noop', run: async () => this.ctx.logger.info('Cluster is already converged') }];
    }

    const steps = actions.map((action) => this.toUpdateStep(action, previous));
    const rotationStep = this.wireguardRotationStep();

    if (rotationStep) {
      steps.unshift(rotationStep);
    }

    return steps;
  }

  private shouldRotateWireguardKeys(): boolean {
    if (!this.ctx.config?.wireguard.keyRotation.enabled) {
      return false;
    }

    const evaluation = new WireguardService(this.ctx).evaluateRotation();

    return evaluation.dueNodeIds.length > 0;
  }

  private wireguardRotationStep(): OrchestratorStep | undefined {
    if (!this.shouldRotateWireguardKeys()) {
      return undefined;
    }

    return {
      name: 'wireguard.rotate-if-due',
      run: () => new WireguardService(this.ctx).rotateIfDue().then(() => undefined),
    };
  }

  destroySteps(): OrchestratorStep[] {
    const wireguard = new WireguardService(this.ctx);
    const swarm = new SwarmService(this.ctx);
    const ceph = new CephService(this.ctx);
    const traefik = new TraefikService(this.ctx);
    const vip = new VipService(this.ctx);
    const routing = new RoutingService(this.ctx);

    const steps: OrchestratorStep[] = [{ name: 'traefik.destroy', run: () => traefik.destroy() }];

    if (this.ctx.config?.routing?.enabled) {
      steps.unshift({ name: 'routing.destroy', run: () => routing.destroy() });
    }

    steps.push(
      { name: 'swarm.leave', run: () => swarm.leaveAll() },
      { name: 'ceph.unmount', run: () => ceph.unmountAll() },
      { name: 'wireguard.teardown', run: () => wireguard.teardownAndClearKeys() },
    );

    if (this.ctx.config?.vip) {
      steps.splice(this.ctx.config?.routing?.enabled ? 2 : 1, 0, { name: 'vip.destroy', run: () => vip.destroy() });
    }

    return steps;
  }

  async init(): Promise<void> {
    await runGuardedMutation(this.ctx, 'cluster.init', async () => {
      await this.runSteps(this.initSteps(), 'cluster.init');
    });
  }

  async update(): Promise<void> {
    await runGuardedMutation(this.ctx, 'cluster.update', async () => {
      const statePath = defaultStatePath(this.ctx.options.configPath);
      const previous = loadClusterState(this.ctx.options.configPath);

      this.ctx.logger.info(
        previous
          ? `Applying incremental update from ${statePath}`
          : 'No cluster state found; running full init before recording state',
      );

      await this.runSteps(this.updateSteps(previous), 'cluster.update');
    });
  }

  async destroy(): Promise<void> {
    await runGuardedMutation(this.ctx, 'cluster.destroy', async () => {
      await this.runSteps(this.destroySteps(), 'cluster.destroy');
      await this.clearState();
    });
  }

  async status(): Promise<void> {
    const snapshot = await this.collectStatus();

    if (this.ctx.options.json) {
      printStructuredOutput(this.ctx, snapshot);
      return;
    }

    console.log('Prerequisites:', JSON.stringify(snapshot.prerequisites, null, 2));

    for (const node of snapshot.wireguard.nodes) {
      this.ctx.logger.info(`${node.nodeId}: exit=${node.exitCode}`);
      if (node.output) {
        console.log(node.output);
      }
    }

    if (snapshot.swarm.nodesOutput) {
      console.log(snapshot.swarm.nodesOutput);
    }

    if (snapshot.swarm.networksOutput) {
      console.log(snapshot.swarm.networksOutput);
    }

    if (snapshot.ceph.output) {
      console.log(snapshot.ceph.output);
    }

    if (snapshot.traefik.output) {
      console.log(snapshot.traefik.output);
    }

    if (snapshot.vip) {
      for (const node of snapshot.vip.nodes) {
        this.ctx.logger.info(`VIP status for ${node.nodeId}`);
        if (node.output) {
          console.log(node.output);
        }
      }
    }

    if (snapshot.routing) {
      for (const hub of snapshot.routing.hubs) {
        this.ctx.logger.info(`Routing status for ${hub.nodeId}`);
        if (hub.output) {
          console.log(hub.output);
        }
      }
    }
  }

  private async collectStatus(): Promise<ClusterStatusSnapshot> {
    const checks = await runPrerequisiteChecks(this.ctx);
    const wireguard = new WireguardService(this.ctx);
    const swarm = new SwarmService(this.ctx);
    const ceph = new CephService(this.ctx);
    const traefik = new TraefikService(this.ctx);

    const wireguardNodes = await wireguard.inspectStatus();
    const swarmStatus = await swarm.inspectStatus();
    const cephStatus = await ceph.inspectStatus();
    const traefikStatus = await traefik.inspectStatus();

    const snapshot: ClusterStatusSnapshot = {
      prerequisites: checks,
      wireguard: { nodes: wireguardNodes },
      swarm: swarmStatus,
      ceph: {
        exitCode: cephStatus.exitCode,
        output: cephStatus.output || cephStatus.stderr,
      },
      traefik: traefikStatus,
    };

    if (this.ctx.config?.vip) {
      snapshot.vip = { nodes: await new VipService(this.ctx).inspectStatus() };
    }

    if (this.ctx.config?.routing?.enabled) {
      snapshot.routing = { hubs: await new RoutingService(this.ctx).inspectStatus() };
    }

    return snapshot;
  }

  private toUpdateStep(action: UpdateAction, previous?: ClusterState): OrchestratorStep {
    const wireguard = new WireguardService(this.ctx);
    const swarm = new SwarmService(this.ctx);
    const ceph = new CephService(this.ctx);
    const volume = new VolumeService(this.ctx);
    const traefik = new TraefikService(this.ctx);
    const vip = new VipService(this.ctx);
    const routing = new RoutingService(this.ctx);
    const node = new NodeService(this.ctx);

    switch (action.type) {
      case 'host.bootstrap':
        return {
          name: `host.bootstrap.${action.nodeId}`,
          run: () => new HostService(this.ctx).bootstrapAndVerifyNode(action.nodeId),
        };
      case 'wireguard.reconcile':
        return { name: 'wireguard.reconcile', run: () => wireguard.reconcile() };
      case 'wireguard.add-peer':
        return { name: `wireguard.add-peer.${action.nodeId}`, run: () => wireguard.addPeer(action.nodeId) };
      case 'wireguard.remove-peer':
        return { name: `wireguard.remove-peer.${action.nodeId}`, run: () => wireguard.removePeer(action.nodeId) };
      case 'swarm.join':
        return { name: 'swarm.join', run: () => swarm.joinNodes(action.nodeIds) };
      case 'swarm.reconcile-labels':
        return { name: 'swarm.reconcile-labels', run: () => swarm.reconcileLabels(action.nodeIds) };
      case 'ceph.mount':
        return { name: 'ceph.cephfs-mount', run: () => ceph.mountCephfs(action.nodeIds) };
      case 'ceph.osd-add':
        return { name: `ceph.osd-add.${action.nodeId}`, run: () => ceph.addOsdForNode(action.nodeId) };
      case 'ceph.osd-remove':
        return {
          name: `ceph.osd-remove.${action.nodeId}`,
          run: () => ceph.removeOsdsForNode(action.nodeId, action.hostname),
        };
      case 'ceph.osd-reconcile':
        return { name: 'ceph.osd-reconcile', run: () => ceph.reconcileOsds() };
      case 'volume.create':
        return { name: 'volume.create', run: () => volume.createVolumes(action.volumeNames) };
      case 'swarm.network.create':
        return { name: 'swarm.network.create', run: () => swarm.createNetworks(action.networkNames) };
      case 'traefik.update':
        return { name: 'traefik.update', run: () => traefik.update() };
      case 'vip.init':
        return { name: 'vip.init', run: () => vip.init() };
      case 'vip.reconcile':
        return { name: 'vip.reconcile', run: () => vip.reconcile() };
      case 'vip.destroy':
        return { name: 'vip.destroy', run: () => vip.destroy() };
      case 'routing.init':
        return { name: 'routing.init', run: () => routing.init() };
      case 'routing.reconcile':
        return { name: 'routing.reconcile', run: () => routing.reconcile() };
      case 'routing.destroy':
        return { name: 'routing.destroy', run: () => routing.destroy() };
      case 'node.leave':
        return {
          name: `node.leave.${action.nodeId}`,
          run: () =>
            node.leave(action.nodeId, {
              hostname: previous?.nodeHostnames?.[action.nodeId],
              skipOsdRemoval: Boolean(
                previous?.nodeHostnames?.[action.nodeId] &&
                  (previous?.osdDevices?.[action.nodeId] || previous?.cephOsdNodes?.includes(action.nodeId)),
              ),
            }),
        };
      default: {
        const exhaustive: never = action;
        throw new Error(`Unsupported update action: ${JSON.stringify(exhaustive)}`);
      }
    }
  }

  private async clearState(): Promise<void> {
    if (this.ctx.options.dryRun) {
      return;
    }

    await removeHostInventories(this.ctx);

    const statePath = defaultStatePath(this.ctx.options.configPath);

    if (fs.existsSync(statePath)) {
      fs.unlinkSync(statePath);
    }
  }

  private async runSteps(steps: OrchestratorStep[], operation: string): Promise<void> {
    const executed: string[] = [];

    for (const step of steps) {
      executed.push(step.name);

      if (!(this.ctx.options.json && this.ctx.options.dryRun)) {
        this.ctx.logger.info(`Running step: ${step.name}`);
      }

      await step.run();
    }

    if (this.ctx.options.json && this.ctx.options.dryRun) {
      printStructuredOutput(this.ctx, {
        operation,
        dryRun: true,
        steps: executed,
      });
    }
  }
}
