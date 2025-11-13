import { createReducer, on } from '@ngrx/store';
import {
  createClientAgent,
  createClientAgentFailure,
  createClientAgentSuccess,
  deleteClientAgent,
  deleteClientAgentFailure,
  deleteClientAgentSuccess,
  loadClientAgent,
  loadClientAgentFailure,
  loadClientAgents,
  loadClientAgentsFailure,
  loadClientAgentsSuccess,
  loadClientAgentSuccess,
  updateClientAgent,
  updateClientAgentFailure,
  updateClientAgentSuccess,
} from './agents.actions';
import type { AgentResponseDto } from './agents.types';

export interface AgentsState {
  // Agents grouped by clientId
  entities: Record<string, AgentResponseDto[]>;
  // Selected agent per client
  selectedAgents: Record<string, AgentResponseDto | null>;
  // Loading states per client
  loading: Record<string, boolean>;
  loadingAgent: Record<string, boolean>;
  creating: Record<string, boolean>;
  updating: Record<string, boolean>;
  deleting: Record<string, boolean>;
  // Errors per client
  errors: Record<string, string | null>;
}

export const initialAgentsState: AgentsState = {
  entities: {},
  selectedAgents: {},
  loading: {},
  loadingAgent: {},
  creating: {},
  updating: {},
  deleting: {},
  errors: {},
};

function updateClientState(
  state: AgentsState,
  clientId: string,
  updater: (clientState: {
    agents: AgentResponseDto[];
    selectedAgent: AgentResponseDto | null;
    loading: boolean;
    loadingAgent: boolean;
    creating: boolean;
    updating: boolean;
    deleting: boolean;
    error: string | null;
  }) => Partial<{
    agents: AgentResponseDto[];
    selectedAgent: AgentResponseDto | null;
    loading: boolean;
    loadingAgent: boolean;
    creating: boolean;
    updating: boolean;
    deleting: boolean;
    error: string | null;
  }>,
): AgentsState {
  const clientState = {
    agents: state.entities[clientId] || [],
    selectedAgent: state.selectedAgents[clientId] || null,
    loading: state.loading[clientId] || false,
    loadingAgent: state.loadingAgent[clientId] || false,
    creating: state.creating[clientId] || false,
    updating: state.updating[clientId] || false,
    deleting: state.deleting[clientId] || false,
    error: state.errors[clientId] || null,
  };

  const updates = updater(clientState);

  return {
    ...state,
    entities: {
      ...state.entities,
      ...(updates.agents !== undefined && { [clientId]: updates.agents }),
    },
    selectedAgents: {
      ...state.selectedAgents,
      ...(updates.selectedAgent !== undefined && { [clientId]: updates.selectedAgent }),
    },
    loading: {
      ...state.loading,
      ...(updates.loading !== undefined && { [clientId]: updates.loading }),
    },
    loadingAgent: {
      ...state.loadingAgent,
      ...(updates.loadingAgent !== undefined && { [clientId]: updates.loadingAgent }),
    },
    creating: {
      ...state.creating,
      ...(updates.creating !== undefined && { [clientId]: updates.creating }),
    },
    updating: {
      ...state.updating,
      ...(updates.updating !== undefined && { [clientId]: updates.updating }),
    },
    deleting: {
      ...state.deleting,
      ...(updates.deleting !== undefined && { [clientId]: updates.deleting }),
    },
    errors: {
      ...state.errors,
      ...(updates.error !== undefined && { [clientId]: updates.error }),
    },
  };
}

export const agentsReducer = createReducer(
  initialAgentsState,
  // Load Client Agents
  on(loadClientAgents, (state, { clientId }) =>
    updateClientState(state, clientId, (clientState) => ({
      ...clientState,
      loading: true,
      error: null,
    })),
  ),
  on(loadClientAgentsSuccess, (state, { clientId, agents }) =>
    updateClientState(state, clientId, () => ({
      agents,
      loading: false,
      error: null,
    })),
  ),
  on(loadClientAgentsFailure, (state, { clientId, error }) =>
    updateClientState(state, clientId, () => ({
      loading: false,
      error,
    })),
  ),
  // Load Client Agent by ID
  on(loadClientAgent, (state, { clientId }) =>
    updateClientState(state, clientId, (clientState) => ({
      ...clientState,
      loadingAgent: true,
      error: null,
    })),
  ),
  on(loadClientAgentSuccess, (state, { clientId, agent }) =>
    updateClientState(state, clientId, (clientState) => {
      const existingIndex = clientState.agents.findIndex((a) => a.id === agent.id);
      const agents =
        existingIndex >= 0
          ? clientState.agents.map((a) => (a.id === agent.id ? agent : a))
          : [...clientState.agents, agent];
      return {
        agents,
        selectedAgent: agent,
        loadingAgent: false,
        error: null,
      };
    }),
  ),
  on(loadClientAgentFailure, (state, { clientId, error }) =>
    updateClientState(state, clientId, () => ({
      loadingAgent: false,
      error,
    })),
  ),
  // Create Client Agent
  on(createClientAgent, (state, { clientId }) =>
    updateClientState(state, clientId, (clientState) => ({
      ...clientState,
      creating: true,
      error: null,
    })),
  ),
  on(createClientAgentSuccess, (state, { clientId, agent }) => {
    // Strip password from CreateAgentResponseDto to store as AgentResponseDto
    const { password, ...agentResponse } = agent;
    return updateClientState(state, clientId, (clientState) => ({
      agents: [...clientState.agents, agentResponse],
      selectedAgent: agentResponse,
      creating: false,
      error: null,
    }));
  }),
  on(createClientAgentFailure, (state, { clientId, error }) =>
    updateClientState(state, clientId, () => ({
      creating: false,
      error,
    })),
  ),
  // Update Client Agent
  on(updateClientAgent, (state, { clientId }) =>
    updateClientState(state, clientId, (clientState) => ({
      ...clientState,
      updating: true,
      error: null,
    })),
  ),
  on(updateClientAgentSuccess, (state, { clientId, agent }) =>
    updateClientState(state, clientId, (clientState) => ({
      agents: clientState.agents.map((a) => (a.id === agent.id ? agent : a)),
      selectedAgent: clientState.selectedAgent?.id === agent.id ? agent : clientState.selectedAgent,
      updating: false,
      error: null,
    })),
  ),
  on(updateClientAgentFailure, (state, { clientId, error }) =>
    updateClientState(state, clientId, () => ({
      updating: false,
      error,
    })),
  ),
  // Delete Client Agent
  on(deleteClientAgent, (state, { clientId }) =>
    updateClientState(state, clientId, (clientState) => ({
      ...clientState,
      deleting: true,
      error: null,
    })),
  ),
  on(deleteClientAgentSuccess, (state, { clientId, agentId }) =>
    updateClientState(state, clientId, (clientState) => ({
      agents: clientState.agents.filter((a) => a.id !== agentId),
      selectedAgent: clientState.selectedAgent?.id === agentId ? null : clientState.selectedAgent,
      deleting: false,
      error: null,
    })),
  ),
  on(deleteClientAgentFailure, (state, { clientId, error }) =>
    updateClientState(state, clientId, () => ({
      deleting: false,
      error,
    })),
  ),
);
