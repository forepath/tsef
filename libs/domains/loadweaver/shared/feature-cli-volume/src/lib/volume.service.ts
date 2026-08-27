import type { LoadweaverContext } from '@forepath/loadweaver/shared/util-cli-core';

export class VolumeService {
  constructor(private readonly ctx: LoadweaverContext) {}

  async createAll(): Promise<void> {
    const config = this.requireConfig();
    await this.createVolumes(config.volumes.map((volume) => volume.name));
  }

  async createVolumes(volumeNames: string[]): Promise<void> {
    const config = this.requireConfig();
    const targets = config.volumes.filter((volume) => volumeNames.includes(volume.name));

    for (const volume of targets) {
      await this.createVolume(volume.name, volume.path);
    }
  }

  async createVolume(name: string, relativePath: string): Promise<void> {
    const config = this.requireConfig();
    const fullPath = `${config.ceph.mountPath}/${relativePath}`;

    for (const nodeId of Object.keys(config.nodes)) {
      await this.ctx
        .sshForNode(nodeId)
        .execRemote(
          `mkdir -p ${fullPath} && docker volume create --driver local --opt type=none --opt device=${fullPath} --opt o=bind ${name} || true`,
          { dryRun: this.ctx.options.dryRun },
        );
    }
  }

  async list(): Promise<void> {
    const primary = this.requireConfig().cluster.primaryManager;
    const result = await this.ctx
      .sshForNode(primary)
      .execRemote('docker volume ls', { dryRun: this.ctx.options.dryRun });

    console.log(result.stdout);
  }

  private requireConfig() {
    if (!this.ctx.config) {
      throw new Error('Configuration not loaded');
    }

    return this.ctx.config;
  }
}
