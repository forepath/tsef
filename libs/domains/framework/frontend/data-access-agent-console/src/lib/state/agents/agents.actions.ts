import { createAction, props } from '@ngrx/store';
import type {
  AgentResponseDto,
  CreateAgentDto,
  CreateAgentResponseDto,
  ListClientAgentsParams,
  UpdateAgentDto,
} from './agents.types';

// List Client Agents Actions
export const loadClientAgents = createAction(
  '[Agents] Load Client Agents',
  props<{ clientId: string; params?: ListClientAgentsParams }>(),
);

export const loadClientAgentsSuccess = createAction(
  '[Agents] Load Client Agents Success',
  props<{ clientId: string; agents: AgentResponseDto[] }>(),
);

export const loadClientAgentsFailure = createAction(
  '[Agents] Load Client Agents Failure',
  props<{ clientId: string; error: string }>(),
);

// Get Client Agent by ID Actions
export const loadClientAgent = createAction(
  '[Agents] Load Client Agent',
  props<{ clientId: string; agentId: string }>(),
);

export const loadClientAgentSuccess = createAction(
  '[Agents] Load Client Agent Success',
  props<{ clientId: string; agent: AgentResponseDto }>(),
);

export const loadClientAgentFailure = createAction(
  '[Agents] Load Client Agent Failure',
  props<{ clientId: string; error: string }>(),
);

// Create Client Agent Actions
export const createClientAgent = createAction(
  '[Agents] Create Client Agent',
  props<{ clientId: string; agent: CreateAgentDto }>(),
);

export const createClientAgentSuccess = createAction(
  '[Agents] Create Client Agent Success',
  props<{ clientId: string; agent: CreateAgentResponseDto }>(),
);

export const createClientAgentFailure = createAction(
  '[Agents] Create Client Agent Failure',
  props<{ clientId: string; error: string }>(),
);

// Update Client Agent Actions
export const updateClientAgent = createAction(
  '[Agents] Update Client Agent',
  props<{ clientId: string; agentId: string; agent: UpdateAgentDto }>(),
);

export const updateClientAgentSuccess = createAction(
  '[Agents] Update Client Agent Success',
  props<{ clientId: string; agent: AgentResponseDto }>(),
);

export const updateClientAgentFailure = createAction(
  '[Agents] Update Client Agent Failure',
  props<{ clientId: string; error: string }>(),
);

// Delete Client Agent Actions
export const deleteClientAgent = createAction(
  '[Agents] Delete Client Agent',
  props<{ clientId: string; agentId: string }>(),
);

export const deleteClientAgentSuccess = createAction(
  '[Agents] Delete Client Agent Success',
  props<{ clientId: string; agentId: string }>(),
);

export const deleteClientAgentFailure = createAction(
  '[Agents] Delete Client Agent Failure',
  props<{ clientId: string; error: string }>(),
);
