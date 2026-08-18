import { createReducer, on } from '@ngrx/store';

import {
  clearFilterRulesError,
  createFilterRule,
  createFilterRuleFailure,
  createFilterRuleSuccess,
  deleteFilterRule,
  deleteFilterRuleFailure,
  deleteFilterRuleSuccess,
  loadFilterRules,
  loadFilterRulesFailure,
  loadFilterRulesSuccess,
  loadMoreFilterRules,
  loadMoreFilterRulesFailure,
  loadMoreFilterRulesSuccess,
  updateFilterRule,
  updateFilterRuleFailure,
  updateFilterRuleSuccess,
} from './filter-rules.actions';
import type { FilterRuleResponseDto } from './filter-rules.types';

export interface FilterRulesState {
  rules: FilterRuleResponseDto[];
  loading: boolean;
  saving: boolean;
  deleting: boolean;
  error: string | null;
  hasMore: boolean;
  nextOffset: number;
  appendLoading: boolean;
  appendError: string | null;
  search: string | null;
}

export const initialFilterRulesState: FilterRulesState = {
  rules: [],
  loading: false,
  saving: false,
  deleting: false,
  error: null,
  hasMore: false,
  nextOffset: 0,
  appendLoading: false,
  appendError: null,
  search: null,
};

export const filterRulesReducer = createReducer(
  initialFilterRulesState,
  on(loadFilterRules, (state, { params }) => ({
    ...state,
    rules: [],
    loading: true,
    error: null,
    hasMore: false,
    nextOffset: 0,
    appendLoading: false,
    appendError: null,
    search: params?.search?.trim() ? params.search.trim() : null,
  })),
  on(loadFilterRulesSuccess, (state, { rules, hasMore, nextOffset }) => ({
    ...state,
    loading: false,
    rules,
    error: null,
    hasMore,
    nextOffset,
    appendLoading: false,
    appendError: null,
  })),
  on(loadFilterRulesFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
    hasMore: false,
    appendLoading: false,
  })),
  on(loadMoreFilterRules, (state) => ({
    ...state,
    appendLoading: true,
    appendError: null,
  })),
  on(loadMoreFilterRulesSuccess, (state, { rules, hasMore, nextOffset }) => ({
    ...state,
    rules: [...state.rules, ...rules],
    hasMore,
    nextOffset,
    appendLoading: false,
    appendError: null,
  })),
  on(loadMoreFilterRulesFailure, (state, { error }) => ({
    ...state,
    appendLoading: false,
    appendError: error,
  })),
  on(createFilterRule, (state) => ({ ...state, saving: true, error: null })),
  on(createFilterRuleSuccess, (state, { rule }) => ({
    ...state,
    saving: false,
    rules: [...state.rules, rule].sort((a, b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt)),
    error: null,
  })),
  on(createFilterRuleFailure, (state, { error }) => ({ ...state, saving: false, error })),
  on(updateFilterRule, (state) => ({ ...state, saving: true, error: null })),
  on(updateFilterRuleSuccess, (state, { rule }) => ({
    ...state,
    saving: false,
    rules: state.rules.map((r) => (r.id === rule.id ? rule : r)),
    error: null,
  })),
  on(updateFilterRuleFailure, (state, { error }) => ({ ...state, saving: false, error })),
  on(deleteFilterRule, (state) => ({ ...state, deleting: true, error: null })),
  on(deleteFilterRuleSuccess, (state, { id }) => ({
    ...state,
    deleting: false,
    rules: state.rules.filter((r) => r.id !== id),
    error: null,
  })),
  on(deleteFilterRuleFailure, (state, { error }) => ({ ...state, deleting: false, error })),
  on(clearFilterRulesError, (state) => ({ ...state, error: null })),
);
