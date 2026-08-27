import type { Command } from 'commander';

import { writeTemplate } from '@forepath/shared/shared/util-config-loader';

import type { LoadweaverContext } from '@forepath/loadweaver/shared/util-cli-core';
import {
  DEFAULT_CONFIG_TEMPLATE,
  loadLoadweaverConfig,
  validateSshIdentityFiles,
  warnUnreachableProxyJumps,
  assertPrerequisites,
  withExamples,
} from '@forepath/loadweaver/shared/util-cli-core';

export function registerConfigCommands(program: Command, getCtx: (command: Command) => LoadweaverContext): void {
  const config = program.command('config').description('Manage loadweaver configuration');
  withExamples(config, ['loadweaver config validate', 'loadweaver config init-template ./loadweaver.yml']);

  const show = config
    .command('show')
    .description('Print the loaded configuration')
    .action(function (this: Command) {
      const ctx = getCtx(this);

      if (!ctx.config) {
        throw new Error('No configuration loaded');
      }

      console.log(JSON.stringify(ctx.config, null, 2));
    });
  withExamples(show, ['loadweaver config show', 'loadweaver --config ./loadweaver.yml config show']);

  const validate = config
    .command('validate')
    .description('Validate the configuration file')
    .option('--config <path>', 'Config file path')
    .action(async function (this: Command, options: { config?: string }) {
      const ctx = getCtx(this);
      const path = options.config ?? ctx.options.configPath;
      const config = loadLoadweaverConfig(path, { env: ctx.options.env });
      assertPrerequisites(validateSshIdentityFiles(config));
      await warnUnreachableProxyJumps(config, ctx.executor, ctx.logger, ctx.options.dryRun);
      ctx.logger.info(`Configuration is valid: ${path}`);
    });
  withExamples(validate, ['loadweaver config validate', 'loadweaver config validate --config ./loadweaver.yml']);

  const initTemplate = config
    .command('init-template')
    .description('Write a sample loadweaver.yml template')
    .argument('[path]', 'Output path', './loadweaver.yml')
    .action(function (this: Command, outputPath: string) {
      const ctx = getCtx(this);
      writeTemplate(outputPath, DEFAULT_CONFIG_TEMPLATE);
      ctx.logger.info(`Wrote template configuration to ${outputPath}`);
    });
  withExamples(initTemplate, ['loadweaver config init-template', 'loadweaver config init-template ./staging.yml']);
}
