import * as fs from 'node:fs';
import * as path from 'node:path';

import { parse as parseYaml } from 'yaml';
import type { ZodType } from 'zod';

import { deepMerge } from './deep-merge';

export interface LoadConfigOptions<T> {
  profile?: string;
  schema?: ZodType<T>;
  /** YAML/JSON strings or objects merged after the file (and profile). Later entries win. */
  overlays?: Array<string | Record<string, unknown>>;
}

export function parseConfigContent<T>(content: string, schema?: ZodType<T>): T {
  const parsed = content.trim().startsWith('{') ? JSON.parse(content) : parseYaml(content);

  if (schema) {
    return schema.parse(parsed);
  }

  return parsed as T;
}

function parseOverlay(overlay: string | Record<string, unknown>): unknown {
  if (typeof overlay === 'string') {
    const trimmed = overlay.trim();

    if (!trimmed) {
      return undefined;
    }

    return parseConfigContent(trimmed);
  }

  return overlay;
}

export function loadConfigFile<T>(configPath: string, options: LoadConfigOptions<T> = {}): T {
  const absolutePath = path.resolve(configPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Config file not found: ${absolutePath}`);
  }

  const raw = fs.readFileSync(absolutePath, 'utf-8');
  let parsed = parseConfigContent<T>(raw);

  if (options.profile && typeof parsed === 'object' && parsed !== null && 'profiles' in parsed) {
    const record = parsed as Record<string, unknown> & { profiles?: Record<string, unknown> };
    const overlay = record.profiles?.[options.profile];

    if (overlay && typeof overlay === 'object') {
      parsed = deepMerge(parsed, overlay);
    }
  }

  for (const overlay of options.overlays ?? []) {
    const parsedOverlay = parseOverlay(overlay);

    if (parsedOverlay === undefined) {
      continue;
    }

    if (typeof parsedOverlay !== 'object' || parsedOverlay === null || Array.isArray(parsedOverlay)) {
      throw new Error('Config overlay must be a YAML/JSON object');
    }

    parsed = deepMerge(parsed, parsedOverlay);
  }

  if (options.schema) {
    return options.schema.parse(parsed);
  }

  return parsed;
}

export function writeTemplate(configPath: string, content: string): void {
  const absolutePath = path.resolve(configPath);

  if (fs.existsSync(absolutePath)) {
    throw new Error(`Config file already exists: ${absolutePath}`);
  }

  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, 'utf-8');
}
