import { loadConfigFile } from '@forepath/shared/shared/util-config-loader';

import { loadweaverConfigSchema } from './schema';
import type { LoadweaverConfig } from './schema';

export const LOADWEAVER_CONFIG_ENV = 'LOADWEAVER_CONFIG';

export function readLoadweaverConfigOverlay(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const value = env[LOADWEAVER_CONFIG_ENV];

  if (value === undefined || value.trim().length === 0) {
    return undefined;
  }

  return value;
}

export function loadLoadweaverConfig(
  configPath: string,
  options: { env?: string; processEnv?: NodeJS.ProcessEnv } = {},
): LoadweaverConfig {
  const overlay = readLoadweaverConfigOverlay(options.processEnv ?? process.env);

  return loadConfigFile(configPath, {
    schema: loadweaverConfigSchema,
    profile: options.env,
    overlays: overlay ? [overlay] : undefined,
  });
}
