import { ClientSideConnection, PROTOCOL_VERSION } from '@agentclientprotocol/sdk';
import { Injectable, Logger } from '@nestjs/common';

import { AgentsRepository } from '../../repositories/agents.repository';
import type { AgentProviderOptions, AgentResponseObject } from '../agent-provider.interface';

import {
  AcpClientHostFactory,
  createAcpClientHostBindings,
  type AcpClientHostBindings,
  type AcpPromptEventSink,
} from './acp-client-host';
import type { AcpLaunchSpec, AcpSessionKey } from './acp-launch-spec.types';
import { AcpNotificationMapper, createAcpToolCallState } from './acp-notification-mapper';
import {
  CURSOR_ACP_STALE_AUTH_USER_MESSAGE,
  isCursorAcpStaleAuthPrefix,
  isCursorAcpStaleAuthResponse,
} from './acp-stale-auth';
import type { AcpTransport } from './acp-transport.interface';
import { DockerAcpTransportFactory } from './docker-acp-transport';

interface ManagedAcpSession {
  connection: ClientSideConnection;
  transport: AcpTransport;
  acpSessionId: string;
  bindings: AcpClientHostBindings;
}

interface PromptAttemptMeta {
  acpSessionId: string | undefined;
  aggregatedText: string;
  staleAuth: boolean;
}

@Injectable()
export class AcpSessionService {
  private readonly logger = new Logger(AcpSessionService.name);
  private readonly sessions = new Map<string, ManagedAcpSession>();

  constructor(
    private readonly transportFactory: DockerAcpTransportFactory,
    private readonly clientHostFactory: AcpClientHostFactory,
    private readonly mapper: AcpNotificationMapper,
    private readonly agentsRepository: AgentsRepository,
  ) {}

  private sessionMapKey(key: AcpSessionKey): string {
    return `${key.agentId}:${key.containerId}:${key.resumeSessionSuffix ?? ''}`;
  }

  async closeSession(key: AcpSessionKey): Promise<void> {
    const mapKey = this.sessionMapKey(key);
    const existing = this.sessions.get(mapKey);

    if (!existing) {
      return;
    }

    await existing.transport.close();
    this.sessions.delete(mapKey);
  }

  async closeSessionsForAgent(agentId: string): Promise<void> {
    const prefix = `${agentId}:`;

    for (const [mapKey, session] of this.sessions.entries()) {
      if (!mapKey.startsWith(prefix)) {
        continue;
      }

      await session.transport.close();
      this.sessions.delete(mapKey);
    }
  }

  async *promptStream(
    key: AcpSessionKey,
    launchSpec: AcpLaunchSpec,
    message: string,
    options?: AgentProviderOptions,
  ): AsyncIterable<AgentResponseObject> {
    yield* this.promptStreamWithStaleAuthRetry(key, launchSpec, message, options, false);
  }

  async prompt(
    key: AcpSessionKey,
    launchSpec: AcpLaunchSpec,
    message: string,
    options?: AgentProviderOptions,
  ): Promise<string> {
    const parts: string[] = [];

    for await (const obj of this.promptStream(key, launchSpec, message, options)) {
      parts.push(JSON.stringify(obj));
    }

    return parts.join('\n');
  }

  private async *promptStreamWithStaleAuthRetry(
    key: AcpSessionKey,
    launchSpec: AcpLaunchSpec,
    message: string,
    options: AgentProviderOptions | undefined,
    isRetry: boolean,
  ): AsyncIterable<AgentResponseObject> {
    const meta: PromptAttemptMeta = {
      acpSessionId: undefined,
      aggregatedText: '',
      staleAuth: false,
    };

    yield* this.iteratePromptAttempt(key, launchSpec, message, options, meta);

    if (meta.staleAuth) {
      await this.resetSessionAfterStaleAuth(key);

      if (isRetry) {
        this.logger.warn(
          `Cursor ACP stale auth persisted after restart for agent ${key.agentId}` +
            (key.resumeSessionSuffix ? ` (suffix ${key.resumeSessionSuffix})` : ''),
        );
        throw new Error(CURSOR_ACP_STALE_AUTH_USER_MESSAGE);
      }

      this.logger.warn(
        `Cursor ACP stale auth detected for agent ${key.agentId}; restarting ACP session and retrying once` +
          (key.resumeSessionSuffix ? ` (suffix ${key.resumeSessionSuffix})` : ''),
      );

      // Keep reconnect UX out of the assistant transcript (thinking only).
      yield { type: 'thinking', phase: 'running' };
      yield* this.promptStreamWithStaleAuthRetry(key, launchSpec, message, options, true);

      return;
    }

    if (meta.aggregatedText.trim()) {
      yield this.mapper.buildFinalResult(meta.aggregatedText, meta.acpSessionId);
    }
  }

  /**
   * Streams one ACP prompt. Short replies that still look like the Cursor stale-auth line
   * are held until the turn ends so we can discard them on restart/retry without flashing UI.
   */
  private async *iteratePromptAttempt(
    key: AcpSessionKey,
    launchSpec: AcpLaunchSpec,
    message: string,
    options: AgentProviderOptions | undefined,
    meta: PromptAttemptMeta,
  ): AsyncIterable<AgentResponseObject> {
    const queue: AgentResponseObject[] = [];
    let aggregatedText = '';
    let acpSessionId: string | undefined;
    let done = false;
    let promptError: unknown | null = null;
    const held: AgentResponseObject[] = [];
    let holdingForStaleAuth = true;

    const notify = (() => {
      let resolve: (() => void) | null = null;
      const wait = () =>
        new Promise<void>((r) => {
          resolve = r;
        });
      const signal = () => {
        resolve?.();
        resolve = null;
      };

      return { wait, signal };
    })();

    const sink: AcpPromptEventSink = {
      onResponses: (objects: AgentResponseObject[]) => {
        for (const obj of objects) {
          if (obj.type === 'delta' && typeof obj.delta === 'string') {
            aggregatedText += obj.delta;
          } else if (obj.type === 'result' && typeof obj.result === 'string') {
            aggregatedText = obj.result;
          }

          queue.push(obj);
        }

        notify.signal();
      },
    };

    void this.runPrompt(key, launchSpec, message, options, sink)
      .then((result) => {
        acpSessionId = result.acpSessionId;
      })
      .catch((error: unknown) => {
        promptError = error;
      })
      .finally(() => {
        done = true;
        notify.signal();
      });

    const shouldHoldEvent = (obj: AgentResponseObject): boolean => {
      if (!holdingForStaleAuth) {
        return false;
      }

      if (
        obj.type === 'tool_call' ||
        obj.type === 'tool_result' ||
        obj.type === 'interaction_query' ||
        obj.type === 'interactionQuery' ||
        obj.type === 'question'
      ) {
        holdingForStaleAuth = false;

        return false;
      }

      if (!isCursorAcpStaleAuthPrefix(aggregatedText)) {
        holdingForStaleAuth = false;

        return false;
      }

      return true;
    };

    while (!done || queue.length > 0) {
      const item = queue.shift();

      if (item) {
        if (shouldHoldEvent(item)) {
          held.push(item);
        } else {
          if (held.length > 0) {
            for (const heldItem of held) {
              yield heldItem;
            }

            held.length = 0;
          }

          yield item;
        }

        continue;
      }

      if (done) {
        break;
      }

      await notify.wait();
    }

    if (promptError) {
      throw promptError;
    }

    meta.acpSessionId = acpSessionId;
    meta.aggregatedText = aggregatedText;
    meta.staleAuth = isCursorAcpStaleAuthResponse(aggregatedText);

    if (meta.staleAuth) {
      // Discard held sign-in deltas; caller will restart/retry.
      return;
    }

    for (const heldItem of held) {
      yield heldItem;
    }
  }

  private async resetSessionAfterStaleAuth(key: AcpSessionKey): Promise<void> {
    await this.closeSession(key);
    await this.agentsRepository.clearAcpSession(key.agentId, key.resumeSessionSuffix);
  }

  private async runPrompt(
    key: AcpSessionKey,
    launchSpec: AcpLaunchSpec,
    message: string,
    options: AgentProviderOptions | undefined,
    sink: AcpPromptEventSink,
  ): Promise<{ acpSessionId: string }> {
    const managed = await this.getOrCreateSession(key, launchSpec, sink);

    try {
      await managed.connection.prompt({
        sessionId: managed.acpSessionId,
        prompt: [{ type: 'text', text: message }],
      });
    } catch (error) {
      const err = error as { message?: string };

      // Drop broken sessions so the next turn reconnects cleanly.
      await this.closeSession(key);
      await this.agentsRepository.clearAcpSession(key.agentId, key.resumeSessionSuffix);

      throw new Error(`ACP session prompt failed: ${err.message ?? 'Unknown ACP prompt error'}`);
    }

    return { acpSessionId: managed.acpSessionId };
  }

  private async getOrCreateSession(
    key: AcpSessionKey,
    launchSpec: AcpLaunchSpec,
    sink: AcpPromptEventSink,
  ): Promise<ManagedAcpSession> {
    const mapKey = this.sessionMapKey(key);
    const existing = this.sessions.get(mapKey);

    if (existing) {
      // Retarget the long-lived ACP client at this prompt's sink + fresh tool-call bookkeeping.
      existing.bindings.sink = sink;
      existing.bindings.toolCallState = createAcpToolCallState();

      return existing;
    }

    const bindings = createAcpClientHostBindings(sink);
    const transport = await this.transportFactory.connect(key.containerId, launchSpec);
    const client = this.clientHostFactory.create({ agentId: key.agentId, containerId: key.containerId }, bindings);
    const connection = new ClientSideConnection(() => client, transport.stream);

    try {
      const initResult = await connection.initialize({
        protocolVersion: PROTOCOL_VERSION,
        clientCapabilities: {
          fs: {
            readTextFile: true,
            writeTextFile: true,
          },
        },
      });

      this.logger.debug(`ACP initialized for agent ${key.agentId} (protocol v${initResult.protocolVersion})`);
    } catch (error) {
      await transport.close();
      const err = error as { message?: string };

      throw new Error(`ACP session initialization failed: ${err.message ?? 'Unknown ACP initialization error'}`);
    }

    try {
      const knownSessionId = await this.agentsRepository.findPersistedAcpSessionId(
        key.agentId,
        key.containerId,
        key.resumeSessionSuffix,
      );
      const sessionId = await this.createOrLoadSession(connection, launchSpec, knownSessionId ?? undefined);

      if (sessionId !== knownSessionId) {
        await this.agentsRepository.saveAcpSession(key.agentId, key.containerId, sessionId, key.resumeSessionSuffix);
      } else if (knownSessionId) {
        this.logger.debug(
          `Resumed persisted ACP session for agent ${key.agentId}` +
            (key.resumeSessionSuffix ? ` (suffix ${key.resumeSessionSuffix})` : ''),
        );
      }

      const managed: ManagedAcpSession = {
        connection,
        transport,
        acpSessionId: sessionId,
        bindings,
      };

      this.sessions.set(mapKey, managed);

      return managed;
    } catch (error) {
      await transport.close();
      throw error;
    }
  }

  /**
   * Prefer `newSession` for a fresh transport.
   * Call `loadSession` only with a real agent-issued id previously returned by the agent.
   */
  private async createOrLoadSession(
    connection: ClientSideConnection,
    launchSpec: AcpLaunchSpec,
    knownSessionId?: string,
  ): Promise<string> {
    if (launchSpec.supportsLoadSession && knownSessionId) {
      try {
        await connection.loadSession({
          sessionId: knownSessionId,
          cwd: launchSpec.cwd,
          mcpServers: [],
        });

        return knownSessionId;
      } catch (error) {
        const err = error as { message?: string };

        this.logger.debug(`ACP loadSession failed for known id, creating new session: ${err.message}`);
      }
    }

    try {
      const created = await connection.newSession({
        cwd: launchSpec.cwd,
        mcpServers: [],
      });

      return created.sessionId;
    } catch (error) {
      const err = error as { message?: string };

      throw new Error(`ACP session creation failed: ${err.message ?? 'Unknown ACP session error'}`);
    }
  }
}
