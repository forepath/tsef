import { buildSshConnectionOptions, summarizeRemoteCommand } from './ssh-client';

describe('summarizeRemoteCommand', () => {
  it('uses the first non-comment line', () => {
    expect(summarizeRemoteCommand('# setup\napt-get update\napt-get install -y docker')).toBe('apt-get update');
  });

  it('truncates very long commands', () => {
    const longLine = `echo ${'x'.repeat(120)}`;
    expect(summarizeRemoteCommand(longLine).endsWith('...')).toBe(true);
  });
});

describe('buildSshConnectionOptions', () => {
  it('includes connect and keepalive options when configured', () => {
    expect(
      buildSshConnectionOptions({
        host: 'example.com',
        connectTimeoutSeconds: 10,
        serverAliveIntervalSeconds: 15,
      }),
    ).toEqual([
      '-o BatchMode=yes',
      '-o StrictHostKeyChecking=accept-new',
      '-o ConnectTimeout=10',
      '-o ServerAliveInterval=15',
    ]);
  });

  it('omits timeout options when set to zero', () => {
    expect(
      buildSshConnectionOptions({
        host: 'example.com',
        connectTimeoutSeconds: 0,
        serverAliveIntervalSeconds: 0,
      }),
    ).toEqual(['-o BatchMode=yes', '-o StrictHostKeyChecking=accept-new']);
  });
});
