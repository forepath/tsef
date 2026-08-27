import type { LoadweaverContext } from '@forepath/loadweaver/shared/util-cli-core';
import {
  assertRemoteSuccess,
  deriveOsdDevices,
  isRemoteAlreadyExists,
  printStructuredOutput,
} from '@forepath/loadweaver/shared/util-cli-core';

export class CephService {
  constructor(private readonly ctx: LoadweaverContext) {}

  async init(): Promise<void> {
    const config = this.requireConfig();
    const monNodes = Object.entries(config.nodes).filter(([, node]) => node.roles.includes('ceph-mon'));

    for (const [nodeId] of monNodes) {
      const check = await this.ctx
        .sshForNode(nodeId)
        .execRemote('command -v cephadm', { dryRun: this.ctx.options.dryRun });

      if (check.exitCode !== 0) {
        throw new Error(`cephadm is not installed on ${nodeId}. Run loadweaver host bootstrap first.`);
      }
    }

    const primary = config.cluster.primaryManager;
    const bootstrap = await this.ctx
      .sshForNode(primary)
      .execRemote("cephadm bootstrap --mon-ip $(hostname -I | awk '{print $1}')", {
        dryRun: this.ctx.options.dryRun,
      });

    if (bootstrap.exitCode !== 0 && !isRemoteAlreadyExists(bootstrap)) {
      const status = await this.ctx.sshForNode(primary).execRemote('ceph -s', { dryRun: this.ctx.options.dryRun });

      if (status.exitCode !== 0) {
        assertRemoteSuccess(bootstrap, 'Ceph bootstrap');
      }
    }

    await this.reconcileOsds();
  }

  async createCephfs(): Promise<void> {
    const config = this.requireConfig();
    const primary = config.cluster.primaryManager;
    const result = await this.ctx
      .sshForNode(primary)
      .execRemote(`ceph fs volume create ${config.ceph.fsName}`, { dryRun: this.ctx.options.dryRun });

    if (result.exitCode !== 0 && !isRemoteAlreadyExists(result)) {
      assertRemoteSuccess(result, `Create CephFS ${config.ceph.fsName}`);
    }
  }

  async mountCephfsAll(): Promise<void> {
    await this.mountCephfs(Object.keys(this.requireConfig().nodes));
  }

  async mountCephfs(nodeIds: string[]): Promise<void> {
    const config = this.requireConfig();

    for (const nodeId of nodeIds) {
      if (!config.nodes[nodeId]) {
        continue;
      }

      const mountPath = config.ceph.mountPath;
      const result = await this.ctx
        .sshForNode(nodeId)
        .execRemote(
          `mkdir -p ${mountPath} && if mountpoint -q ${mountPath}; then exit 0; else mount -t ceph :${config.ceph.fsName} ${mountPath}; fi`,
          { dryRun: this.ctx.options.dryRun },
        );

      assertRemoteSuccess(result, `Mount CephFS on ${nodeId}`);
    }
  }

  async reconcileOsds(): Promise<void> {
    const devices = deriveOsdDevices(this.requireConfig());

    for (const nodeId of Object.keys(devices).sort()) {
      await this.addOsdForNode(nodeId);
    }
  }

  async addOsdForNode(nodeId: string): Promise<void> {
    const config = this.requireConfig();
    const node = config.nodes[nodeId];

    if (!node) {
      throw new Error(`Unknown node: ${nodeId}`);
    }

    const device = node.osdDevice;

    if (!device) {
      throw new Error(`Node ${nodeId} has no osdDevice configured`);
    }

    await this.addOsd(nodeId, device);
  }

  async addOsd(nodeId: string, device: string): Promise<void> {
    const config = this.requireConfig();
    const node = config.nodes[nodeId];

    if (!node) {
      throw new Error(`Unknown node: ${nodeId}`);
    }

    const primary = config.cluster.primaryManager;
    const hostName = node.hostname;
    const hostIp = node.wireguardIp;

    const hostAdd = await this.ctx.sshForNode(primary).execRemote(`ceph orch host add ${hostName} ${hostIp}`, {
      dryRun: this.ctx.options.dryRun,
    });

    if (hostAdd.exitCode !== 0 && !isRemoteAlreadyExists(hostAdd)) {
      assertRemoteSuccess(hostAdd, `Add Ceph host ${hostName}`);
    }

    const result = await this.ctx
      .sshForNode(primary)
      .execRemote(`ceph orch daemon add osd ${hostName}:${device}`, { dryRun: this.ctx.options.dryRun });

    if (result.exitCode !== 0 && !isRemoteAlreadyExists(result)) {
      assertRemoteSuccess(result, `Add OSD on ${hostName}:${device}`);
    }
  }

  async removeOsdsForNode(nodeId: string, hostnameOverride?: string): Promise<void> {
    const config = this.requireConfig();
    const hostName = hostnameOverride ?? config.nodes[nodeId]?.hostname;

    if (!hostName) {
      this.ctx.logger.warn(`Skipping OSD removal for ${nodeId}: hostname unknown`);
      return;
    }

    const primary = config.cluster.primaryManager;
    const listResult = await this.ctx
      .sshForNode(primary)
      .execRemote(`ceph orch ps --hostname ${hostName} --daemon_type osd --format '{{.daemon_name}}'`, {
        dryRun: this.ctx.options.dryRun,
      });

    assertRemoteSuccess(listResult, `List OSD daemons on ${hostName}`);

    const daemonNames = listResult.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    for (const daemonName of daemonNames) {
      const osdId = daemonName.startsWith('osd.') ? daemonName : `osd.${daemonName.replace(/^ceph-osd\./, '')}`;
      const removeResult = await this.ctx
        .sshForNode(primary)
        .execRemote(`ceph osd out ${osdId} && ceph orch osd rm ${osdId} --zap`, {
          dryRun: this.ctx.options.dryRun,
        });

      if (removeResult.exitCode !== 0 && !this.ctx.options.dryRun) {
        assertRemoteSuccess(removeResult, `Remove OSD ${osdId} from ${hostName}`);
      }
    }

    const hostRemove = await this.ctx
      .sshForNode(primary)
      .execRemote(`ceph orch host rm ${hostName} --force`, { dryRun: this.ctx.options.dryRun });

    if (hostRemove.exitCode !== 0 && !isRemoteAlreadyExists(hostRemove) && daemonNames.length > 0) {
      assertRemoteSuccess(hostRemove, `Remove Ceph host ${hostName}`);
    }
  }

  async removeOsd(osdId: string): Promise<void> {
    const primary = this.requireConfig().cluster.primaryManager;
    const normalized = osdId.startsWith('osd.') ? osdId : `osd.${osdId}`;
    const result = await this.ctx
      .sshForNode(primary)
      .execRemote(`ceph osd out ${normalized} && ceph orch osd rm ${normalized} --zap`, {
        dryRun: this.ctx.options.dryRun,
      });

    assertRemoteSuccess(result, `Remove OSD ${normalized}`);
  }

  async status(): Promise<void> {
    const snapshot = await this.inspectStatus();

    if (this.ctx.options.json) {
      printStructuredOutput(this.ctx, snapshot);
      return;
    }

    console.log(snapshot.output || snapshot.stderr);
  }

  async inspectStatus(): Promise<{ exitCode: number; output: string; stderr: string }> {
    const primary = this.requireConfig().cluster.primaryManager;
    const result = await this.ctx
      .sshForNode(primary)
      .execRemote('ceph -s && ceph fs status && ceph orch device ls', { dryRun: this.ctx.options.dryRun });

    return {
      exitCode: result.exitCode,
      output: result.stdout,
      stderr: result.stderr,
    };
  }

  async unmount(nodeId: string): Promise<void> {
    const config = this.requireConfig();
    const mountPath = config.ceph.mountPath;

    await this.ctx.sshForNode(nodeId).execRemote(`umount ${mountPath} || true`, { dryRun: this.ctx.options.dryRun });
  }

  async unmountAll(): Promise<void> {
    for (const nodeId of Object.keys(this.requireConfig().nodes)) {
      await this.unmount(nodeId);
    }
  }

  private requireConfig() {
    if (!this.ctx.config) {
      throw new Error('Configuration not loaded');
    }

    return this.ctx.config;
  }
}
