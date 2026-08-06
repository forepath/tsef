export const PROTOCOL_VERSION = 1;

export type Stream = {
  writable: WritableStream<unknown>;
  readable: ReadableStream<unknown>;
};

export function ndJsonStream(): Stream {
  return {
    writable: new WritableStream<unknown>(),
    readable: new ReadableStream<unknown>(),
  };
}

export class ClientSideConnection {
  constructor(
    private readonly _toClient: () => unknown,
    private readonly _stream: Stream,
  ) {}

  async initialize(): Promise<{ protocolVersion: number }> {
    return { protocolVersion: PROTOCOL_VERSION };
  }

  async newSession(): Promise<{ sessionId: string }> {
    return { sessionId: 'mock-session-id' };
  }

  async loadSession(): Promise<{ sessionId: string }> {
    return { sessionId: 'mock-session-id' };
  }

  async prompt(): Promise<{ stopReason: string }> {
    return { stopReason: 'end_turn' };
  }
}
