import { AcpNotificationMapper, createAcpToolCallState } from './acp-notification-mapper';

describe('AcpNotificationMapper', () => {
  const mapper = new AcpNotificationMapper();

  it('maps agent_message_chunk to delta', () => {
    const results = mapper.mapSessionUpdate({
      sessionId: 'sess-1',
      update: {
        sessionUpdate: 'agent_message_chunk',
        content: { type: 'text', text: 'Hello' },
      },
    } as never);

    expect(results).toEqual([{ type: 'delta', delta: 'Hello' }]);
  });

  it('maps tool_call to tool_call unified object', () => {
    const results = mapper.mapSessionUpdate({
      sessionId: 'sess-1',
      update: {
        sessionUpdate: 'tool_call',
        toolCallId: 'tc-1',
        title: 'bash',
        status: 'pending',
      },
    } as never);

    expect(results).toEqual([
      {
        type: 'tool_call',
        toolCallId: 'tc-1',
        name: 'bash',
        status: 'started',
      },
    ]);
  });

  it('prefers compact title over kind for find/grep style tools', () => {
    const results = mapper.mapSessionUpdate({
      sessionId: 'sess-1',
      update: {
        sessionUpdate: 'tool_call',
        toolCallId: 'tc-find',
        title: 'Find',
        kind: 'search',
        status: 'pending',
      },
    } as never);

    expect(results[0]).toMatchObject({ name: 'Find' });
  });

  it('uses kind label when title is a long shell command', () => {
    const longCommand = '`ls -la /app; echo ---; du -sh /opt/workspace; uname -a; which node`';
    const results = mapper.mapSessionUpdate({
      sessionId: 'sess-1',
      update: {
        sessionUpdate: 'tool_call',
        toolCallId: 'tc-shell',
        title: longCommand,
        kind: 'execute',
        status: 'pending',
        rawInput: { command: longCommand },
      },
    } as never);

    expect(results[0]).toMatchObject({
      type: 'tool_call',
      name: 'shell',
      args: { command: longCommand },
    });
  });

  it('remembers tool name across updates that omit title', () => {
    const state = createAcpToolCallState();

    mapper.mapSessionUpdate(
      {
        sessionId: 'sess-1',
        update: {
          sessionUpdate: 'tool_call',
          toolCallId: 'tc-1',
          title: 'Grep',
          status: 'pending',
        },
      } as never,
      state,
    );

    const inProgress = mapper.mapSessionUpdate(
      {
        sessionId: 'sess-1',
        update: {
          sessionUpdate: 'tool_call_update',
          toolCallId: 'tc-1',
          status: 'in_progress',
        },
      } as never,
      state,
    );

    const completed = mapper.mapSessionUpdate(
      {
        sessionId: 'sess-1',
        update: {
          sessionUpdate: 'tool_call_update',
          toolCallId: 'tc-1',
          status: 'completed',
          content: [{ type: 'content', content: { type: 'text', text: 'match in file.ts' } }],
        },
      } as never,
      state,
    );

    expect(inProgress).toEqual([]);
    expect(completed).toEqual([
      {
        type: 'tool_result',
        toolCallId: 'tc-1',
        name: 'Grep',
        result: 'match in file.ts',
        isError: false,
      },
    ]);
  });

  it('does not emit a second tool_call for status-only progress updates', () => {
    const state = createAcpToolCallState();

    const first = mapper.mapSessionUpdate(
      {
        sessionId: 'sess-1',
        update: {
          sessionUpdate: 'tool_call',
          toolCallId: 'tc-shell',
          title: 'shell',
          kind: 'execute',
          status: 'pending',
        },
      } as never,
      state,
    );
    const second = mapper.mapSessionUpdate(
      {
        sessionId: 'sess-1',
        update: {
          sessionUpdate: 'tool_call_update',
          toolCallId: 'tc-shell',
          status: 'in_progress',
        },
      } as never,
      state,
    );

    expect(first).toHaveLength(1);
    expect(second).toEqual([]);
  });

  it('maps completed tool updates to tool results with rawOutput', () => {
    const results = mapper.mapSessionUpdate({
      sessionId: 'sess-1',
      update: {
        sessionUpdate: 'tool_call_update',
        toolCallId: 'tc-1',
        title: 'bash',
        status: 'completed',
        rawOutput: { stdout: 'ok', stderr: '', signal: '' },
      },
    } as never);

    expect(results).toEqual([
      {
        type: 'tool_result',
        toolCallId: 'tc-1',
        name: 'bash',
        result: { stdout: 'ok', stderr: '', signal: '' },
        isError: false,
      },
    ]);
  });

  it('buildFinalResult produces result object', () => {
    expect(mapper.buildFinalResult('done', 'sess-1')).toEqual({
      type: 'result',
      subtype: 'success',
      result: 'done',
      session_id: 'sess-1',
    });
  });
});
