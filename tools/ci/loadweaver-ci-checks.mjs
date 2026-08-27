#!/usr/bin/env node
/**
 * Loadweaver CI checks: dry-run step JSON and rotation-status exit codes.
 * Invoked via: nx run loadweaver-cli-loadweaver-e2e:ci-checks
 */
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const cliEntry = path.join(
  workspaceRoot,
  'dist/apps/loadweaver/cli-loadweaver/main.js',
);
const fixturesDir = path.join(
  workspaceRoot,
  'apps/loadweaver/cli-loadweaver-e2e/fixtures',
);

function runLoadweaver(args, { expectStatus } = {}) {
  const result = spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: workspaceRoot,
    encoding: 'utf-8',
  });

  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

  if (expectStatus !== undefined && result.status !== expectStatus) {
    throw new Error(
      `loadweaver ${args.join(' ')} exited with ${result.status}, expected ${expectStatus}\n${output}`,
    );
  }

  if (expectStatus === undefined && result.status !== 0) {
    throw new Error(
      `loadweaver ${args.join(' ')} failed with exit ${result.status}\n${output}`,
    );
  }

  return { status: result.status ?? 1, output };
}

function extractJsonPayload(output) {
  const operationMatch = output.match(/\{[\s\S]*"operation"[\s\S]*\}/);

  if (operationMatch) {
    return JSON.parse(operationMatch[0]);
  }

  const start = output.indexOf('{');

  if (start === -1) {
    throw new Error(`No JSON object found in output:\n${output}`);
  }

  let depth = 0;

  for (let index = start; index < output.length; index += 1) {
    const char = output[index];

    if (char === '{') {
      depth += 1;
    }

    if (char === '}') {
      depth -= 1;
    }

    if (depth === 0) {
      return JSON.parse(output.slice(start, index + 1));
    }
  }

  throw new Error(`Unbalanced JSON in output:\n${output}`);
}

function assertJsonDryRunSteps(configPath) {
  const { output } = runLoadweaver([
    '--json',
    '--dry-run',
    '--config',
    configPath,
    'cluster',
    'update',
  ]);
  const payload = extractJsonPayload(output);

  if (payload.operation !== 'cluster.update' || payload.dryRun !== true) {
    throw new Error(`Unexpected dry-run payload: ${output}`);
  }

  if (
    !Array.isArray(payload.steps) ||
    !payload.steps.some((step) => String(step).includes('host.bootstrap'))
  ) {
    throw new Error(`Dry-run steps missing host.bootstrap: ${output}`);
  }
}

function assertRoutingDryRunInit(configPath) {
  const { output } = runLoadweaver([
    '--json',
    '--dry-run',
    '--config',
    configPath,
    'cluster',
    'init',
  ]);
  const payload = extractJsonPayload(output);

  if (
    !Array.isArray(payload.steps) ||
    !payload.steps.some((step) => String(step) === 'routing.init')
  ) {
    throw new Error(`Dry-run init steps missing routing.init: ${output}`);
  }
}

function assertRotationStatusExitCodes(configPath, rotationDisabledConfigPath) {
  const dueCheck = runLoadweaver(
    ['--json', '--config', configPath, 'wireguard', 'rotation-status'],
    {
      expectStatus: 1,
    },
  );
  const duePayload = extractJsonPayload(dueCheck.output);

  if (
    duePayload.exitCode !== 1 ||
    !Array.isArray(duePayload.dueNodeIds) ||
    duePayload.dueNodeIds.length === 0
  ) {
    throw new Error(
      `Expected due rotation status payload, got: ${dueCheck.output}`,
    );
  }

  runLoadweaver(['--config', configPath, 'wireguard', 'rotation-status'], {
    expectStatus: 1,
  });

  const okCheck = runLoadweaver(
    [
      '--json',
      '--config',
      rotationDisabledConfigPath,
      'wireguard',
      'rotation-status',
    ],
    {
      expectStatus: 0,
    },
  );
  const okPayload = extractJsonPayload(okCheck.output);

  if (okPayload.exitCode !== 0) {
    throw new Error(
      `Expected exitCode 0 when rotation disabled, got: ${okCheck.output}`,
    );
  }
}

function assertProductionDryRunCommands(productionFixturePath, workspaceDir) {
  const statePath = path.join(workspaceDir, '.loadweaver', 'state.json');
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(
    statePath,
    `${JSON.stringify(
      {
        version: 1,
        clusterName: 'loadweaver-ci-production',
        nodes: ['node-a1', 'node-a2'],
        swarmLabels: {},
        traefikImage: 'traefik:v3',
        traefikMode: 'global',
        traefikAcmeEnabled: true,
        traefikAcmeChallengeType: 'dns',
        traefikAcmeDnsProvider: 'cloudflare',
        osdDevices: { 'node-a2': '/dev/sdb' },
        cephOsdNodes: ['node-a2'],
        nodeHostnames: {
          'node-a1': 'ci-a1.example.com',
          'node-a2': 'ci-a2.example.com',
        },
        overlayNetworks: ['traefik-public'],
        volumes: ['traefik-config', 'traefik-certs'],
        vipConfigured: true,
        routingEnabled: false,
        routingHubNodes: [],
        routingLocalAsn: null,
        routingClusterCidr: null,
        routingExportWireguardSubnet: true,
        routingPeers: [],
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      null,
      2,
    )}\n`,
  );

  const updateConfigPath = path.join(workspaceDir, 'loadweaver-update.yml');
  fs.copyFileSync(productionFixturePath, updateConfigPath);

  const { output: updateOutput } = runLoadweaver([
    '--json',
    '--dry-run',
    '--yes',
    '--config',
    updateConfigPath,
    'cluster',
    'update',
  ]);
  const updatePayload = extractJsonPayload(updateOutput);

  if (
    !Array.isArray(updatePayload.steps) ||
    !updatePayload.steps.some((step) =>
      String(step).includes('ceph.osd-add.node-a3'),
    )
  ) {
    throw new Error(
      `Dry-run update steps missing ceph.osd-add.node-a3: ${updateOutput}`,
    );
  }

  const { output: verifyAcmeOutput } = runLoadweaver([
    '--json',
    '--dry-run',
    '--config',
    productionFixturePath,
    'traefik',
    'verify-acme',
  ]);
  const verifyAcmePayload = extractJsonPayload(verifyAcmeOutput);

  if (
    verifyAcmePayload.dryRun !== true ||
    verifyAcmePayload.challengeType !== 'dns'
  ) {
    throw new Error(
      `Unexpected traefik verify-acme dry-run payload: ${verifyAcmeOutput}`,
    );
  }

  const { output: verifyVipOutput } = runLoadweaver([
    '--json',
    '--dry-run',
    '--config',
    productionFixturePath,
    'vip',
    'verify-failover',
  ]);
  const verifyVipPayload = extractJsonPayload(verifyVipOutput);

  if (
    verifyVipPayload.dryRun !== true ||
    verifyVipPayload.mode !== 'check-only'
  ) {
    throw new Error(
      `Unexpected vip verify-failover dry-run payload: ${verifyVipOutput}`,
    );
  }
}

function main() {
  if (!fs.existsSync(cliEntry)) {
    throw new Error(
      `CLI build missing at ${cliEntry}. Run nx run loadweaver-cli-loadweaver:build first.`,
    );
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loadweaver-ci-'));
  const templateConfigPath = path.join(tempDir, 'loadweaver-template.yml');

  try {
    runLoadweaver(['config', 'init-template', templateConfigPath]);
    assertJsonDryRunSteps(templateConfigPath);
    assertRotationStatusExitCodes(
      templateConfigPath,
      path.join(fixturesDir, 'loadweaver-ci-rotation-disabled.yml'),
    );
    assertRoutingDryRunInit(
      path.join(fixturesDir, 'loadweaver-ci-routing-enabled.yml'),
    );
    assertProductionDryRunCommands(
      path.join(fixturesDir, 'loadweaver-ci-production.yml'),
      tempDir,
    );
    console.log('Loadweaver CI checks passed.');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main();
