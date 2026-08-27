import type { Command } from 'commander';

import type { LoadweaverContext } from '@forepath/loadweaver/shared/util-cli-core';
import { runGuardedMutation, withExamples } from '@forepath/loadweaver/shared/util-cli-core';

import { TraefikService } from './traefik.service';

export function registerTraefikCommands(program: Command, getCtx: (command: Command) => LoadweaverContext): void {
  const traefik = program.command('traefik').description('Traefik ingress management');
  withExamples(traefik, ['loadweaver traefik status', 'loadweaver --dry-run traefik deploy']);

  const deploy = traefik
    .command('deploy')
    .description('Deploy Traefik as a Swarm stack')
    .action(async function (this: Command) {
      const ctx = getCtx(this);
      await runGuardedMutation(ctx, 'traefik.deploy', () => new TraefikService(ctx).deploy());
    });
  withExamples(deploy, ['loadweaver traefik deploy']);

  const update = traefik
    .command('update')
    .description('Roll out Traefik configuration changes')
    .action(async function (this: Command) {
      const ctx = getCtx(this);
      await runGuardedMutation(ctx, 'traefik.update', () => new TraefikService(ctx).update());
    });
  withExamples(update, ['loadweaver traefik update']);

  const destroy = traefik
    .command('destroy')
    .description('Remove the Traefik stack')
    .action(async function (this: Command) {
      const ctx = getCtx(this);
      await runGuardedMutation(ctx, 'traefik.destroy', () => new TraefikService(ctx).destroy());
    });
  withExamples(destroy, ['loadweaver --dry-run traefik destroy']);

  const status = traefik
    .command('status')
    .description('Show Traefik service status')
    .action(async function (this: Command) {
      await new TraefikService(getCtx(this)).status();
    });
  withExamples(status, ['loadweaver traefik status']);

  const verifyAcme = traefik
    .command('verify-acme')
    .description('Verify Traefik ACME resolver configuration and certificate storage')
    .action(async function (this: Command) {
      await new TraefikService(getCtx(this)).verifyAcme();
    });
  withExamples(verifyAcme, ['loadweaver traefik verify-acme', 'loadweaver --json traefik verify-acme']);

  const acmeEnv = traefik.command('acme-env').description('Persist DNS provider credentials on the primary manager');

  const acmeEnvInit = acmeEnv
    .command('init')
    .description('Create /etc/loadweaver/traefik-acme.env template on the primary manager')
    .action(async function (this: Command) {
      const ctx = getCtx(this);
      await runGuardedMutation(ctx, 'traefik.acme-env.init', () => new TraefikService(ctx).initAcmeEnvFile());
    });
  withExamples(acmeEnvInit, ['loadweaver traefik acme-env init', 'loadweaver --dry-run traefik acme-env init']);
}
