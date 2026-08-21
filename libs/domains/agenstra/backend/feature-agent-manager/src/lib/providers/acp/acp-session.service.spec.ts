import { Test, TestingModule } from '@nestjs/testing';

import { AgentsRepository } from '../../repositories/agents.repository';
import type { AgentResponseObject } from '../agent-provider.interface';

import { AcpClientHostFactory, type AcpPromptEventSink } from './acp-client-host';
import type { AcpLaunchSpec, AcpSessionKey } from './acp-launch-spec.types';
import { AcpNotificationMapper } from './acp-notification-mapper';
import { AcpSessionService } from './acp-session.service';
import { CURSOR_ACP_STALE_AUTH_TEXT, CURSOR_ACP_STALE_AUTH_USER_MESSAGE } from './acp-stale-auth';
import { DockerAcpTransportFactory } from './docker-acp-transport';

type CreateOrLoad = (
  connection: {
    loadSession: jest.Mock;
    newSession: jest.Mock;
  },
  launchSpec: { cwd: string; supportsLoadSession: boolean },
  knownSessionId?: string,
) => Promise<string>;

type RunPrompt = (
  key: AcpSessionKey,
  launchSpec: AcpLaunchSpec,
  message: string,
  options: undefined,
  sink: AcpPromptEventSink,
) => Promise<{ acpSessionId: string }>;

describe('AcpSessionService', () => {
  let service: AcpSessionService;
  let agentsRepository: {
    findPersistedAcpSessionId: jest.Mock;
    saveAcpSession: jest.Mock;
    clearAcpSession: jest.Mock;
  };
  let mapper: { mapSessionUpdate: jest.Mock; buildFinalResult: jest.Mock };
  const loadSession = jest.fn();
  const newSession = jest.fn();

  const sessionKey: AcpSessionKey = {
    agentId: 'agent-1',
    containerId: 'container-1',
  };
  const launchSpec = {
    cwd: '/app',
    supportsLoadSession: true,
    executable: 'cursor-agent',
    args: ['acp'],
  } as AcpLaunchSpec;

  beforeEach(async () => {
    jest.clearAllMocks();
    newSession.mockResolvedValue({ sessionId: 'sess-new' });
    loadSession.mockResolvedValue({});
    agentsRepository = {
      findPersistedAcpSessionId: jest.fn(),
      saveAcpSession: jest.fn(),
      clearAcpSession: jest.fn().mockResolvedValue(undefined),
    };
    mapper = {
      mapSessionUpdate: jest.fn(),
      buildFinalResult: jest.fn((text: string, sessionId?: string) => ({
        type: 'result',
        subtype: 'success',
        result: text,
        ...(sessionId ? { session_id: sessionId } : {}),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcpSessionService,
        { provide: DockerAcpTransportFactory, useValue: { connect: jest.fn() } },
        { provide: AcpClientHostFactory, useValue: { create: jest.fn() } },
        { provide: AcpNotificationMapper, useValue: mapper },
        { provide: AgentsRepository, useValue: agentsRepository },
      ],
    }).compile();

    service = module.get(AcpSessionService);
  });

  const createOrLoad = (): CreateOrLoad =>
    (service as unknown as { createOrLoadSession: CreateOrLoad }).createOrLoadSession.bind(service);

  const collectStream = async (): Promise<AgentResponseObject[]> => {
    const events: AgentResponseObject[] = [];

    for await (const event of service.promptStream(sessionKey, launchSpec, 'hi')) {
      events.push(event);
    }

    return events;
  };

  it('createOrLoadSession loads a known agent-issued session id', async () => {
    const spec = { cwd: '/app', supportsLoadSession: true };

    await expect(createOrLoad()({ loadSession, newSession }, spec, 'sess-old')).resolves.toBe('sess-old');
    expect(loadSession).toHaveBeenCalledWith({
      sessionId: 'sess-old',
      cwd: '/app',
      mcpServers: [],
    });
    expect(newSession).not.toHaveBeenCalled();
  });

  it('createOrLoadSession falls back to newSession when loadSession fails', async () => {
    loadSession.mockRejectedValueOnce(new Error('gone'));
    const spec = { cwd: '/app', supportsLoadSession: true };

    await expect(createOrLoad()({ loadSession, newSession }, spec, 'sess-old')).resolves.toBe('sess-new');
    expect(newSession).toHaveBeenCalled();
  });

  it('createOrLoadSession skips load when no known id', async () => {
    const spec = { cwd: '/app', supportsLoadSession: true };

    await expect(createOrLoad()({ loadSession, newSession }, spec)).resolves.toBe('sess-new');
    expect(loadSession).not.toHaveBeenCalled();
    expect(newSession).toHaveBeenCalled();
  });

  it('promptStream restarts ACP and retries once after Cursor stale-auth reply', async () => {
    let calls = 0;
    const runPrompt = jest
      .spyOn(service as unknown as { runPrompt: RunPrompt }, 'runPrompt')
      .mockImplementation(async (_key, _launchSpec, _message, _options, sink) => {
        calls += 1;

        if (calls === 1) {
          sink.onResponses([{ type: 'delta', delta: CURSOR_ACP_STALE_AUTH_TEXT }]);

          return { acpSessionId: 'sess-stale' };
        }

        sink.onResponses([{ type: 'delta', delta: 'Recovered answer' }]);

        return { acpSessionId: 'sess-fresh' };
      });
    const closeSession = jest.spyOn(service, 'closeSession').mockResolvedValue(undefined);

    const events = await collectStream();

    expect(runPrompt).toHaveBeenCalledTimes(2);
    expect(closeSession).toHaveBeenCalledWith(sessionKey);
    expect(agentsRepository.clearAcpSession).toHaveBeenCalledWith('agent-1', undefined);
    expect(events).toEqual([
      { type: 'thinking', phase: 'running' },
      { type: 'delta', delta: 'Recovered answer' },
      { type: 'result', subtype: 'success', result: 'Recovered answer', session_id: 'sess-fresh' },
    ]);
    expect(events.some((e) => e.type === 'delta' && e.delta === CURSOR_ACP_STALE_AUTH_TEXT)).toBe(false);
  });

  it('promptStream throws when stale-auth persists after retry', async () => {
    jest
      .spyOn(service as unknown as { runPrompt: RunPrompt }, 'runPrompt')
      .mockImplementation(async (_k, _l, _m, _o, sink) => {
        sink.onResponses([{ type: 'delta', delta: CURSOR_ACP_STALE_AUTH_TEXT }]);

        return { acpSessionId: 'sess-stale' };
      });
    jest.spyOn(service, 'closeSession').mockResolvedValue(undefined);

    await expect(collectStream()).rejects.toThrow(CURSOR_ACP_STALE_AUTH_USER_MESSAGE);
    expect(agentsRepository.clearAcpSession).toHaveBeenCalled();
  });
});
