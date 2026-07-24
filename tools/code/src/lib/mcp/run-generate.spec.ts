import { spawnSync } from 'child_process';

import { resolveCodePackageRoot } from './generators-meta';
import { runGenerate } from './run-generate';

jest.mock('child_process', () => ({
  spawnSync: jest.fn(),
}));

const spawnSyncMock = spawnSync as jest.MockedFunction<typeof spawnSync>;

describe('code mcp runGenerate', () => {
  const packageRoot = resolveCodePackageRoot(__dirname);

  beforeEach(() => {
    spawnSyncMock.mockReset();
  });

  it('skips mutating runs without confirm', () => {
    const result = runGenerate({
      generator: 'backend',
      options: { name: 'demo', domain: 'demo' },
      confirm: false,
      workspaceRoot: packageRoot,
    });

    expect(result.skipped).toBe(true);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/confirm=true/);
    expect(result.command).toEqual(
      expect.arrayContaining(['npx', 'nx', 'generate', '@forepath/code:backend', '--name=demo', '--domain=demo']),
    );
    expect(spawnSyncMock).not.toHaveBeenCalled();
  });

  it('runs dry-run without confirm and maps option flags', () => {
    spawnSyncMock.mockReturnValue({
      status: 0,
      stdout: 'dry ok',
      stderr: '',
      pid: 1,
      output: [],
      signal: null,
    } as ReturnType<typeof spawnSync>);

    const result = runGenerate({
      generator: 'lib',
      options: {
        name: 'demo',
        publishable: true,
        skipTests: false,
        tags: ['a', 'b'],
        empty: null,
        missing: undefined,
      },
      confirm: false,
      dryRun: true,
      workspaceRoot: packageRoot,
    });

    expect(result.ok).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('dry ok');
    expect(result.command).toEqual(
      expect.arrayContaining(['--name=demo', '--publishable', '--no-skipTests', '--tags=a', '--tags=b', '--dry-run']),
    );
    expect(spawnSyncMock).toHaveBeenCalledWith(
      'npx',
      expect.arrayContaining(['nx', 'generate', '@forepath/code:lib', '--dry-run']),
      expect.objectContaining({ cwd: packageRoot }),
    );
  });

  it('runs confirmed generate and reports spawn failure', () => {
    spawnSyncMock.mockReturnValue({
      status: 1,
      stdout: '',
      stderr: 'boom',
      pid: 1,
      output: [],
      signal: null,
    } as ReturnType<typeof spawnSync>);

    const result = runGenerate({
      generator: 'frontend',
      options: { name: 'console' },
      confirm: true,
      workspaceRoot: packageRoot,
    });

    expect(result.ok).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe('boom');
  });

  it('throws for unknown generators', () => {
    expect(() =>
      runGenerate({
        generator: 'not-real',
        confirm: true,
        workspaceRoot: packageRoot,
      }),
    ).toThrow(/Unknown generator/);
  });
});
