import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function loadTemplate(fileName: string, bundleKey: string): string {
  const candidates = [
    join(__dirname, fileName),
    join(__dirname, 'templates', bundleKey, fileName),
    join(__dirname, '..', 'templates', bundleKey, fileName),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return readFileSync(candidate, 'utf-8');
    }
  }

  throw new Error(`Template not found: ${bundleKey}/${fileName}`);
}

export const TRAEFIK_STACK_TEMPLATE = loadTemplate('traefik-stack.yml.tpl', 'traefik');
