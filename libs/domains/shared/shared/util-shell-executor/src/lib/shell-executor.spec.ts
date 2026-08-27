import { createShellExecutor } from './shell-executor';

describe('createShellExecutor', () => {
  it('returns dry-run results without executing commands', async () => {
    const executor = createShellExecutor({ dryRun: true });
    const result = await executor.run('echo hello');

    expect(result.dryRun).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.command).toBe('echo hello');
  });
});
