import { joinRemoteCommand } from './join-remote-command.service';

describe('joinRemoteCommand', () => {
  it('joins simple tokens with spaces', () => {
    expect(joinRemoteCommand(['docker', 'ps'])).toBe('docker ps');
  });

  it('quotes arguments that contain spaces', () => {
    expect(joinRemoteCommand(['echo', 'hello world'])).toBe("echo 'hello world'");
  });

  it('quotes empty arguments', () => {
    expect(joinRemoteCommand([''])).toBe("''");
  });
});
