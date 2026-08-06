import { Test, TestingModule } from '@nestjs/testing';

import { AgentsRepository } from '../../repositories/agents.repository';

import { AcpClientHostFactory } from './acp-client-host';
import { AcpNotificationMapper } from './acp-notification-mapper';
import { AcpSessionService } from './acp-session.service';
import { DockerAcpTransportFactory } from './docker-acp-transport';

type CreateOrLoad = (
  connection: {
    loadSession: jest.Mock;
    newSession: jest.Mock;
  },
  launchSpec: { cwd: string; supportsLoadSession: boolean },
  knownSessionId?: string,
) => Promise<string>;

describe('AcpSessionService', () => {
  let service: AcpSessionService;
  const loadSession = jest.fn();
  const newSession = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    newSession.mockResolvedValue({ sessionId: 'sess-new' });
    loadSession.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcpSessionService,
        { provide: DockerAcpTransportFactory, useValue: { connect: jest.fn() } },
        { provide: AcpClientHostFactory, useValue: { create: jest.fn() } },
        { provide: AcpNotificationMapper, useValue: { mapSessionUpdate: jest.fn(), buildFinalResult: jest.fn() } },
        {
          provide: AgentsRepository,
          useValue: {
            findPersistedAcpSessionId: jest.fn(),
            saveAcpSession: jest.fn(),
            clearAcpSession: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AcpSessionService);
  });

  const createOrLoad = (): CreateOrLoad =>
    (service as unknown as { createOrLoadSession: CreateOrLoad }).createOrLoadSession.bind(service);

  it('createOrLoadSession loads a known agent-issued session id', async () => {
    const launchSpec = { cwd: '/app', supportsLoadSession: true };

    await expect(createOrLoad()({ loadSession, newSession }, launchSpec, 'sess-old')).resolves.toBe('sess-old');
    expect(loadSession).toHaveBeenCalledWith({
      sessionId: 'sess-old',
      cwd: '/app',
      mcpServers: [],
    });
    expect(newSession).not.toHaveBeenCalled();
  });

  it('createOrLoadSession falls back to newSession when loadSession fails', async () => {
    loadSession.mockRejectedValueOnce(new Error('gone'));
    const launchSpec = { cwd: '/app', supportsLoadSession: true };

    await expect(createOrLoad()({ loadSession, newSession }, launchSpec, 'sess-old')).resolves.toBe('sess-new');
    expect(newSession).toHaveBeenCalled();
  });

  it('createOrLoadSession skips load when no known id', async () => {
    const launchSpec = { cwd: '/app', supportsLoadSession: true };

    await expect(createOrLoad()({ loadSession, newSession }, launchSpec)).resolves.toBe('sess-new');
    expect(loadSession).not.toHaveBeenCalled();
    expect(newSession).toHaveBeenCalled();
  });
});
