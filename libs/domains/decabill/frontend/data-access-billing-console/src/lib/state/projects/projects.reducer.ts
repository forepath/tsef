import { createReducer, on } from '@ngrx/store';

import type {
  AdminProjectDetailResponse,
  AdminProjectListItem,
  ProjectListItem,
  ProjectResponse,
  ProjectSummaryResponse,
  ProjectsCatalogSummaryResponse,
} from '../../types/projects.types';

import {
  billProjectTime,
  billProjectTimeFailure,
  billProjectTimeSuccess,
  clearProjectsError,
  createAdminProject,
  createAdminProjectFailure,
  createAdminProjectSuccess,
  deleteAdminProject,
  deleteAdminProjectFailure,
  deleteAdminProjectSuccess,
  loadAdminProjectDetail,
  loadAdminProjectDetailFailure,
  loadAdminProjectDetailSuccess,
  loadAdminProjects,
  loadAdminProjectsFailure,
  loadAdminProjectsSuccess,
  loadMoreAdminProjects,
  loadMoreAdminProjectsFailure,
  loadMoreAdminProjectsSuccess,
  loadMoreProjects,
  loadMoreProjectsFailure,
  loadMoreProjectsSuccess,
  loadProjectDetail,
  loadProjectDetailFailure,
  loadProjectDetailSuccess,
  loadProjects,
  loadProjectsCatalogSummary,
  loadProjectsCatalogSummaryFailure,
  loadProjectsCatalogSummarySuccess,
  loadProjectsFailure,
  loadProjectsSuccess,
  loadProjectSummary,
  loadProjectSummaryFailure,
  loadProjectSummarySuccess,
  projectSummaryChanged,
  updateAdminProject,
  updateAdminProjectFailure,
  updateAdminProjectSuccess,
} from './projects.actions';

export interface ProjectsState {
  projects: ProjectListItem[];
  adminProjects: AdminProjectListItem[];
  selectedProject: ProjectResponse | AdminProjectDetailResponse | null;
  summary: ProjectSummaryResponse | null;
  catalogSummary: ProjectsCatalogSummaryResponse | null;
  catalogSummaryLoading: boolean;
  loading: boolean;
  loadingDetail: boolean;
  loadingSummary: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  billing: boolean;
  error: string | null;
  hasMore: boolean;
  nextOffset: number;
  appendLoading: boolean;
  appendError: string | null;
  adminHasMore: boolean;
  adminNextOffset: number;
  adminAppendLoading: boolean;
  adminAppendError: string | null;
  adminSearch: string | null;
  adminUserId: string | null;
  customerSearch: string | null;
}

export const initialProjectsState: ProjectsState = {
  projects: [],
  adminProjects: [],
  selectedProject: null,
  summary: null,
  catalogSummary: null,
  catalogSummaryLoading: false,
  loading: false,
  loadingDetail: false,
  loadingSummary: false,
  creating: false,
  updating: false,
  deleting: false,
  billing: false,
  error: null,
  hasMore: false,
  nextOffset: 0,
  appendLoading: false,
  appendError: null,
  adminHasMore: false,
  adminNextOffset: 0,
  adminAppendLoading: false,
  adminAppendError: null,
  adminSearch: null,
  adminUserId: null,
  customerSearch: null,
};

function mapToAdminListItem(project: ProjectResponse): AdminProjectListItem {
  return {
    ...project,
    unbilledMinutes: 'unbilledMinutes' in project ? Number(project.unbilledMinutes) : 0,
    openBillableAmountNet: 'openBillableAmountNet' in project ? Number(project.openBillableAmountNet) : 0,
  };
}

export const projectsReducer = createReducer(
  initialProjectsState,
  on(loadProjectsCatalogSummary, (state) => ({
    ...state,
    catalogSummaryLoading: true,
  })),
  on(loadProjectsCatalogSummarySuccess, (state, { summary }) => ({
    ...state,
    catalogSummary: summary,
    catalogSummaryLoading: false,
  })),
  on(loadProjectsCatalogSummaryFailure, (state, { error }) => ({
    ...state,
    catalogSummaryLoading: false,
    error,
  })),
  on(loadProjects, (state, { search }) => ({
    ...state,
    projects: [],
    loading: true,
    error: null,
    appendError: null,
    appendLoading: false,
    hasMore: false,
    nextOffset: 0,
    customerSearch: search?.trim() ? search.trim() : null,
  })),
  on(loadAdminProjects, (state, { search, userId }) => ({
    ...state,
    adminProjects: [],
    loading: true,
    error: null,
    adminAppendError: null,
    adminAppendLoading: false,
    adminHasMore: false,
    adminNextOffset: 0,
    adminSearch: search?.trim() ? search.trim() : null,
    adminUserId: userId ?? null,
  })),
  on(loadProjectsSuccess, (state, { projects, hasMore, nextOffset }) => ({
    ...state,
    projects,
    hasMore,
    nextOffset,
    loading: false,
  })),
  on(loadAdminProjectsSuccess, (state, { adminProjects, hasMore, nextOffset }) => ({
    ...state,
    adminProjects,
    adminHasMore: hasMore,
    adminNextOffset: nextOffset,
    loading: false,
  })),
  on(loadProjectsFailure, loadAdminProjectsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
    hasMore: false,
    adminHasMore: false,
  })),
  on(loadMoreProjects, (state) => ({
    ...state,
    appendLoading: true,
    appendError: null,
  })),
  on(loadMoreProjectsSuccess, (state, { projects, hasMore, nextOffset }) => ({
    ...state,
    projects: [...state.projects, ...projects],
    hasMore,
    nextOffset,
    appendLoading: false,
    appendError: null,
  })),
  on(loadMoreProjectsFailure, (state, { error }) => ({
    ...state,
    appendLoading: false,
    appendError: error,
  })),
  on(loadMoreAdminProjects, (state) => ({
    ...state,
    adminAppendLoading: true,
    adminAppendError: null,
  })),
  on(loadMoreAdminProjectsSuccess, (state, { adminProjects, hasMore, nextOffset }) => ({
    ...state,
    adminProjects: [...state.adminProjects, ...adminProjects],
    adminHasMore: hasMore,
    adminNextOffset: nextOffset,
    adminAppendLoading: false,
    adminAppendError: null,
  })),
  on(loadMoreAdminProjectsFailure, (state, { error }) => ({
    ...state,
    adminAppendLoading: false,
    adminAppendError: error,
  })),
  on(loadProjectDetail, loadAdminProjectDetail, (state) => ({
    ...state,
    loadingDetail: true,
    error: null,
  })),
  on(loadProjectDetailSuccess, (state, { project }) => ({
    ...state,
    selectedProject: project,
    loadingDetail: false,
  })),
  on(loadAdminProjectDetailSuccess, (state, { project }) => ({
    ...state,
    selectedProject: project,
    summary: project.summary ?? state.summary,
    loadingDetail: false,
  })),
  on(loadProjectDetailFailure, loadAdminProjectDetailFailure, (state, { error }) => ({
    ...state,
    loadingDetail: false,
    error,
  })),
  on(loadProjectSummary, (state) => ({ ...state, loadingSummary: true, error: null })),
  on(loadProjectSummarySuccess, projectSummaryChanged, (state, { summary }) => ({
    ...state,
    summary,
    loadingSummary: false,
  })),
  on(loadProjectSummaryFailure, (state, { error }) => ({ ...state, loadingSummary: false, error })),
  on(createAdminProject, (state) => ({ ...state, creating: true, error: null })),
  on(createAdminProjectSuccess, (state, { project }) => ({
    ...state,
    creating: false,
    adminProjects: [mapToAdminListItem(project), ...state.adminProjects],
  })),
  on(createAdminProjectFailure, (state, { error }) => ({ ...state, creating: false, error })),
  on(updateAdminProject, (state) => ({ ...state, updating: true, error: null })),
  on(updateAdminProjectSuccess, (state, { project }) => ({
    ...state,
    updating: false,
    adminProjects: state.adminProjects.map((item) => (item.id === project.id ? { ...item, ...project } : item)),
    selectedProject:
      state.selectedProject?.id === project.id ? { ...state.selectedProject, ...project } : state.selectedProject,
  })),
  on(updateAdminProjectFailure, (state, { error }) => ({ ...state, updating: false, error })),
  on(deleteAdminProject, (state) => ({ ...state, deleting: true, error: null })),
  on(deleteAdminProjectSuccess, (state, { projectId }) => ({
    ...state,
    deleting: false,
    adminProjects: state.adminProjects.filter((p) => p.id !== projectId),
    selectedProject: state.selectedProject?.id === projectId ? null : state.selectedProject,
  })),
  on(deleteAdminProjectFailure, (state, { error }) => ({ ...state, deleting: false, error })),
  on(billProjectTime, (state) => ({ ...state, billing: true, error: null })),
  on(billProjectTimeSuccess, (state) => ({ ...state, billing: false })),
  on(billProjectTimeFailure, (state, { error }) => ({ ...state, billing: false, error })),
  on(clearProjectsError, (state) => ({ ...state, error: null })),
);
