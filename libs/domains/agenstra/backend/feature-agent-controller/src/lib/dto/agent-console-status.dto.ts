export interface ChatSessionStatusPayload {
  chatSessionId: string;
  hasUnreadMessages: boolean;
}

export interface EnvironmentStatusPayload {
  clientId: string;
  agentId: string;
  hasUnreadMessages: boolean;
  gitDirty: boolean;
  gitConflict: boolean;
  /** Visible chat sessions (primary + user); omitted/empty on older clients is treated as []. */
  chats?: ChatSessionStatusPayload[];
}

export interface ClientStatusPayload {
  clientId: string;
  hasUnreadMessages: boolean;
  gitDirty: boolean;
}

export interface StatusSnapshotPayload {
  generatedAt: string;
  environments: EnvironmentStatusPayload[];
  clients: ClientStatusPayload[];
  spacesHasAttention: boolean;
}

export interface StatusPatchPayload {
  generatedAt: string;
  environments?: EnvironmentStatusPayload[];
  clients?: ClientStatusPayload[];
  spacesHasAttention?: boolean;
}

export interface MarkEnvironmentReadPayload {
  clientId: string;
  agentId: string;
  /** When set, marks this visible chat session; otherwise marks primary (or env-only legacy). */
  chatSessionId?: string;
}

export interface MarkChatSessionReadPayload {
  clientId: string;
  agentId: string;
  chatSessionId: string;
}

export interface SetActiveEnvironmentPayload {
  clientId: string | null;
  agentId: string | null;
  chatSessionId?: string | null;
}
