import type { LoadweaverContext } from '@forepath/loadweaver/shared/util-cli-core';
import { assertRemoteSuccess, printStructuredOutput } from '@forepath/loadweaver/shared/util-cli-core';
import { renderTemplate } from '@forepath/loadweaver/shared/util-cli-core';

import { TRAEFIK_STACK_TEMPLATE } from './templates';
import {
  buildAcmeEnvFileTemplate,
  buildAcmeEnvSourceCommand,
  buildDnsEnvPresenceCheck,
  DEFAULT_ACME_ENV_FILE,
  missingServiceEnvVars,
  parseDockerServiceEnvLines,
  requiredDnsEnvVars,
} from './traefik-acme-env.service';

const STACK_NAME = 'traefik';
const ACME_LEADER_LABEL = 'loadweaver.acme-leader';

type AcmeConfig = NonNullable<NonNullable<LoadweaverContext['config']>['traefik']['acme']>;

export class TraefikService {
  constructor(private readonly ctx: LoadweaverContext) {}

  async deploy(): Promise<void> {
    await this.ensureAcmeLeaderLabel();
    await this.applyStack();
    await this.assertStackRunning();
  }

  async update(): Promise<void> {
    await this.ensureAcmeLeaderLabel();
    await this.applyStack();
    await this.assertStackRunning();
  }

  async destroy(): Promise<void> {
    const primary = this.requireConfig().cluster.primaryManager;
    await this.ctx
      .sshForNode(primary)
      .execRemote(`docker stack rm ${STACK_NAME} || true`, { dryRun: this.ctx.options.dryRun });
  }

  async status(): Promise<void> {
    const snapshot = await this.inspectStatus();

    if (this.ctx.options.json) {
      printStructuredOutput(this.ctx, snapshot);
      return;
    }

    console.log(snapshot.output);
  }

  async initAcmeEnvFile(): Promise<void> {
    const config = this.requireConfig();
    const acme = config.traefik.acme;

    if (!acme || acme.challengeType !== 'dns' || !acme.dnsProvider) {
      throw new Error('Traefik DNS ACME is not configured');
    }

    const primary = config.cluster.primaryManager;
    const envFile = acme.envFile ?? DEFAULT_ACME_ENV_FILE;
    const template = buildAcmeEnvFileTemplate(acme.dnsProvider);
    const envDir = envFile.replace(/\/[^/]+$/, '');

    const result = await this.ctx
      .sshForNode(primary)
      .execRemote(
        `mkdir -p ${envDir} && if [ ! -f ${envFile} ]; then cat > ${envFile} <<'EOF'\n${template}EOF\nchmod 600 ${envFile}; fi`,
        { dryRun: this.ctx.options.dryRun },
      );

    assertRemoteSuccess(result, `Install ACME env file on ${primary}`);

    if (this.ctx.options.json) {
      printStructuredOutput(this.ctx, { envFile, provider: acme.dnsProvider, created: !this.ctx.options.dryRun });
      return;
    }

    this.ctx.logger.info(`ACME env file ready at ${envFile} on ${primary}`);
  }

  async verifyAcme(): Promise<void> {
    const config = this.requireConfig();
    const acme = config.traefik.acme;

    if (!acme) {
      throw new Error('Traefik ACME is not enabled in configuration');
    }

    if (this.ctx.options.dryRun) {
      const payload = {
        ok: true,
        dryRun: true,
        challengeType: acme.challengeType,
        dnsProvider: acme.dnsProvider ?? null,
        requiredEnvVars: acme.challengeType === 'dns' && acme.dnsProvider ? requiredDnsEnvVars(acme.dnsProvider) : [],
        message: 'Dry-run ACME verification skipped live stack and container checks',
      };

      if (this.ctx.options.json) {
        printStructuredOutput(this.ctx, payload);
        return;
      }

      this.ctx.logger.info(payload.message);
      return;
    }

    const primary = config.cluster.primaryManager;
    const stackCheck = await this.ctx
      .sshForNode(primary)
      .execRemote(`docker stack services ${STACK_NAME} --format '{{.Name}}'`, { dryRun: false });

    assertRemoteSuccess(stackCheck, 'Inspect Traefik stack');

    if (!stackCheck.stdout.trim()) {
      throw new Error('Traefik stack is not deployed');
    }

    const renderedStack = this.renderStack();
    const challengeMarker =
      acme.challengeType === 'dns'
        ? '--certificatesresolvers.le.acme.dnschallenge=true'
        : '--certificatesresolvers.le.acme.httpchallenge.entrypoint=web';

    if (!renderedStack.includes(challengeMarker)) {
      throw new Error('Rendered Traefik stack is missing expected ACME challenge configuration');
    }

    let envInjectionOk = true;
    let missingEnvVars: string[] = [];

    if (acme.challengeType === 'dns' && acme.dnsProvider) {
      const envInspect = await this.ctx
        .sshForNode(primary)
        .execRemote(
          `docker service inspect ${STACK_NAME}_traefik --format '{{range .Spec.TaskTemplate.ContainerSpec.Env}}{{println .}}{{end}}'`,
          { dryRun: false },
        );

      assertRemoteSuccess(envInspect, 'Inspect Traefik service environment');

      const serviceEnv = parseDockerServiceEnvLines(envInspect.stdout);
      missingEnvVars = missingServiceEnvVars(acme.dnsProvider, serviceEnv);
      envInjectionOk = missingEnvVars.length === 0;
    }

    const storagePath = acme.storagePath;
    const certCheck = await this.ctx
      .sshForNode(primary)
      .execRemote(
        `docker ps --filter name=traefik_traefik --format '{{.ID}}' | head -n 1 | xargs -r -I{} docker exec {} sh -c 'test -f ${storagePath} && test -s ${storagePath} && echo present || echo missing'`,
        { dryRun: false },
      );

    const acmeStorePresent = certCheck.stdout.includes('present');
    const ok = acmeStorePresent && envInjectionOk;
    const result = {
      ok,
      challengeType: acme.challengeType,
      dnsProvider: acme.dnsProvider ?? null,
      storagePath,
      acmeStorePresent,
      envInjectionOk,
      missingEnvVars,
      message: !envInjectionOk
        ? `Traefik service is missing DNS provider environment variables: ${missingEnvVars.join(', ')}`
        : acmeStorePresent
          ? 'ACME storage file exists inside Traefik container'
          : 'ACME storage file is missing or empty; certificates may not have been issued yet',
    };

    if (this.ctx.options.json) {
      printStructuredOutput(this.ctx, result);
    } else {
      this.ctx.logger.info(result.message);
    }

    if (!ok) {
      throw new Error(result.message);
    }
  }

  async inspectStatus(): Promise<{ exitCode: number; output: string }> {
    const primary = this.requireConfig().cluster.primaryManager;
    const result = await this.ctx
      .sshForNode(primary)
      .execRemote(`docker stack services ${STACK_NAME} && docker service ls`, { dryRun: this.ctx.options.dryRun });

    return {
      exitCode: result.exitCode,
      output: result.stdout,
    };
  }

  private async applyStack(): Promise<void> {
    const config = this.requireConfig();
    const primary = config.cluster.primaryManager;
    const stack = this.renderStack();
    const acme = config.traefik.acme;
    const envFile = acme?.envFile ?? DEFAULT_ACME_ENV_FILE;
    const envSource =
      acme?.challengeType === 'dns' && acme.dnsProvider && !this.ctx.options.dryRun
        ? `${buildAcmeEnvSourceCommand(envFile)}\n`
        : '';
    const envCheck =
      acme?.challengeType === 'dns' && acme.dnsProvider && !this.ctx.options.dryRun
        ? `${buildDnsEnvPresenceCheck(acme.dnsProvider)}\n`
        : '';

    if (!this.ctx.options.dryRun) {
      this.ctx.logger.debug('Traefik stack YAML prepared');
    }

    const result = await this.ctx
      .sshForNode(primary)
      .execRemote(
        `cat > /tmp/traefik-stack.yml <<'EOF'\n${stack}\nEOF\n${envSource}${envCheck}docker stack deploy -c /tmp/traefik-stack.yml ${STACK_NAME}`,
        { dryRun: this.ctx.options.dryRun },
      );

    assertRemoteSuccess(result, 'Deploy Traefik stack');
  }

  private async assertStackRunning(): Promise<void> {
    if (this.ctx.options.dryRun) {
      return;
    }

    const primary = this.requireConfig().cluster.primaryManager;
    const result = await this.ctx
      .sshForNode(primary)
      .execRemote(`docker stack services ${STACK_NAME} --format '{{.Replicas}}' | head -n 1`, {
        dryRun: this.ctx.options.dryRun,
      });

    assertRemoteSuccess(result, 'Inspect Traefik stack replicas');

    const replicas = result.stdout.trim();

    if (!replicas.includes('/')) {
      throw new Error(`Traefik stack replica summary unavailable: ${replicas || 'empty'}`);
    }

    const [running, desired] = replicas.split('/').map((value) => Number.parseInt(value, 10));

    if (Number.isNaN(running) || Number.isNaN(desired) || running < desired) {
      throw new Error(`Traefik stack is not fully running (${replicas})`);
    }
  }

  private async ensureAcmeLeaderLabel(): Promise<void> {
    const config = this.requireConfig();

    if (!config.traefik.acme) {
      return;
    }

    const primary = config.cluster.primaryManager;
    const result = await this.ctx
      .sshForNode(primary)
      .execRemote(`docker node update --label-add ${ACME_LEADER_LABEL}=true ${primary}`, {
        dryRun: this.ctx.options.dryRun,
      });

    assertRemoteSuccess(result, 'Set Traefik ACME leader label');
  }

  private renderStack(): string {
    const config = this.requireConfig();
    const acme = config.traefik.acme;
    const acmeEnabled = Boolean(acme);
    const acmeArgs = acmeEnabled ? this.renderAcmeArgs(acme!) : '';
    const environmentBlock = acmeEnabled ? this.renderEnvironmentBlock(acme!) : '';
    const deployBlock = this.renderDeployBlock(acmeEnabled, config.traefik.mode);

    return renderTemplate(TRAEFIK_STACK_TEMPLATE, {
      image: config.traefik.image,
      acmeArgs,
      environmentBlock,
      network: config.traefik.network,
      deployBlock,
    });
  }

  private renderAcmeArgs(acme: AcmeConfig): string {
    const common = [
      `      - --certificatesresolvers.le.acme.email=${acme.email}`,
      `      - --certificatesresolvers.le.acme.storage=${acme.storagePath}`,
    ];

    if (acme.challengeType === 'dns') {
      return [
        ...common,
        '      - --certificatesresolvers.le.acme.dnschallenge=true',
        `      - --certificatesresolvers.le.acme.dnschallenge.provider=${acme.dnsProvider}`,
      ].join('\n');
    }

    return [...common, '      - --certificatesresolvers.le.acme.httpchallenge.entrypoint=web'].join('\n');
  }

  private renderEnvironmentBlock(acme: AcmeConfig): string {
    if (acme.challengeType !== 'dns' || !acme.dnsProvider) {
      return '';
    }

    const envLines: string[] = ['    environment:'];

    for (const variable of requiredDnsEnvVars(acme.dnsProvider)) {
      envLines.push(`      ${variable}: \${${variable}}`);
    }

    return `${envLines.join('\n')}\n`;
  }

  private renderDeployBlock(acmeEnabled: boolean, mode: 'global' | 'replicated'): string {
    if (acmeEnabled) {
      return `      mode: replicated
      replicas: 1
      placement:
        constraints:
          - node.labels.${ACME_LEADER_LABEL} == true`;
    }

    if (mode === 'global') {
      return '      mode: global';
    }

    return `      mode: replicated
      replicas: 1
      placement:
        constraints:
          - node.role == manager`;
  }

  private requireConfig() {
    if (!this.ctx.config) {
      throw new Error('Configuration not loaded');
    }

    return this.ctx.config;
  }
}
