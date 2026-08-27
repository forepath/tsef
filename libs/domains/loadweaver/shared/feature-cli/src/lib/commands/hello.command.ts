import type { Command } from 'commander';

import type { LoadweaverContext } from '@forepath/loadweaver/shared/util-cli-core';
import { withExamples } from '@forepath/loadweaver/shared/util-cli-core';

const GREETINGS = [
  'Loadweaver here. I do not provision VMs — I provision audacity: WireGuard mesh, Swarm quorum, Ceph drama, Traefik ingress, and a VIP that actually shows up.',
  'Hello from Loadweaver. Your nodes are separate; your cluster pretends they are not.',
  'Loadweaver online. SSH works, templates render, and no osd has been added without consent. Yet.',
];

export function buildHelloMessage(ctx: LoadweaverContext): string {
  const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
  const lines = [greeting, `Config: ${ctx.options.configPath}`];

  if (ctx.config) {
    lines.push(`Cluster: ${ctx.config.cluster.name} (${Object.keys(ctx.config.nodes).length} node(s) in config)`);
  } else {
    lines.push('Cluster: (no config loaded yet — run config init-template to start weaving)');
  }

  return lines.join('\n');
}

export function registerHelloCommand(program: Command, getCtx: (command: Command) => LoadweaverContext): void {
  const hello = program
    .command('hello')
    .description('Validate CLI wiring and print a greeting')
    .action(function (this: Command) {
      console.log(buildHelloMessage(getCtx(this)));
    });

  withExamples(hello, ['loadweaver hello', 'loadweaver --verbose hello']);
}
