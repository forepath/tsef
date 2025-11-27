import { createAction, props } from '@ngrx/store';
import type { ContainerStatsEntry } from './stats.types';

/**
 * Action dispatched when container stats are received from socket
 */
export const containerStatsReceived = createAction(
  '[Stats] Container Stats Received',
  props<{ entry: ContainerStatsEntry }>(),
);

/**
 * Action to clear stats history for a specific container
 */
export const clearStatsHistory = createAction(
  '[Stats] Clear Stats History',
  props<{ clientId: string; agentId: string }>(),
);

/**
 * Action to clear all stats history
 */
export const clearAllStatsHistory = createAction('[Stats] Clear All Stats History');
