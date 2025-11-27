import { createReducer, on } from '@ngrx/store';
import { clearAllStatsHistory, clearStatsHistory, containerStatsReceived } from './stats.actions';
import type { ContainerStatsEntry } from './stats.types';

/**
 * Stats state structure
 * Maps composite key (clientId:agentId) -> array of stats entries (history)
 */
export interface StatsState {
  // Maps composite key (clientId:agentId) -> array of stats entries (most recent last)
  statsByContainer: Record<string, ContainerStatsEntry[]>;
  // Maximum number of stats entries to keep per container (to prevent memory issues)
  maxEntriesPerContainer: number;
}

/**
 * Generate composite key for stats storage
 */
function getStatsKey(clientId: string, agentId: string): string {
  return `${clientId}:${agentId}`;
}

export const initialStatsState: StatsState = {
  statsByContainer: {},
  maxEntriesPerContainer: 1000, // Keep last 1000 entries per container
};

export const statsReducer = createReducer(
  initialStatsState,
  on(containerStatsReceived, (state, { entry }) => {
    // Use composite key (clientId:agentId) for unique identification
    const key = getStatsKey(entry.clientId, entry.agentId);

    const currentStats = state.statsByContainer[key] || [];
    const updatedStats = [...currentStats, entry];

    // Keep only the last maxEntriesPerContainer entries
    const trimmedStats =
      updatedStats.length > state.maxEntriesPerContainer
        ? updatedStats.slice(-state.maxEntriesPerContainer)
        : updatedStats;

    return {
      ...state,
      statsByContainer: {
        ...state.statsByContainer,
        [key]: trimmedStats,
      },
    };
  }),
  on(clearStatsHistory, (state, { clientId, agentId }) => {
    const key = getStatsKey(clientId, agentId);
    const { [key]: removed, ...remainingStats } = state.statsByContainer;
    return {
      ...state,
      statsByContainer: remainingStats,
    };
  }),
  on(clearAllStatsHistory, (state) => ({
    ...state,
    statsByContainer: {},
  })),
);
