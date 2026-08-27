import type { LoadweaverContext } from '../context';
import { NodeRegistry } from './node-registry.service';
import { validateSshIdentityFiles } from './ssh-config-validation.service';

export interface PrerequisiteCheck {
  name: string;
  passed: boolean;
  message: string;
}

export async function runPrerequisiteChecks(ctx: LoadweaverContext): Promise<PrerequisiteCheck[]> {
  if (!ctx.config) {
    return [{ name: 'config', passed: false, message: 'Configuration not loaded' }];
  }

  const registry = new NodeRegistry(ctx.config);
  const checks: PrerequisiteCheck[] = [];

  if (registry.managers().length === 0) {
    checks.push({ name: 'managers', passed: false, message: 'At least one manager node is required' });
  } else {
    checks.push({ name: 'managers', passed: true, message: `${registry.managers().length} manager node(s) defined` });
  }

  if (!registry.get(registry.primaryManager()).roles.includes('manager')) {
    checks.push({
      name: 'primary-manager',
      passed: false,
      message: 'primaryManager must have the manager role',
    });
  } else {
    checks.push({ name: 'primary-manager', passed: true, message: 'Primary manager role is valid' });
  }

  for (const nodeId of registry.list()) {
    const node = registry.get(nodeId);

    if (!node.wireguardIp) {
      checks.push({ name: `node-${nodeId}-wg-ip`, passed: false, message: `${nodeId} missing wireguardIp` });
    }
  }

  checks.push(...validateSshIdentityFiles(ctx.config));

  return checks;
}

export function assertPrerequisites(checks: PrerequisiteCheck[]): void {
  const failed = checks.filter((check) => !check.passed);

  if (failed.length > 0) {
    throw new Error(`Prerequisite checks failed:\n${failed.map((f) => `- ${f.name}: ${f.message}`).join('\n')}`);
  }
}
