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
  loadMoreAdminProjectsSuccess,
  loadMoreProjects,
  loadMoreProjectsSuccess,
  loadProjectDetail,
  loadProjectDetailFailure,
  loadProjectDetailSuccess,
  loadProjects,
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
import { initialProjectsState, projectsReducer } from './projects.reducer';

describe('projectsReducer', () => {
  const project = {
    id: 'p-1',
    userId: 'u-1',
    name: 'Alpha',
    status: 'active' as const,
    hourlyRateNet: 100,
    currency: 'EUR',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  };

  it('sets loading on loadProjects', () => {
    const state = projectsReducer(initialProjectsState, loadProjects({}));

    expect(state.loading).toBe(true);
    expect(state.projects).toEqual([]);
  });

  it('stores projects on success', () => {
    const state = projectsReducer(
      { ...initialProjectsState, loading: true },
      loadProjectsSuccess({ projects: [project], hasMore: false, nextOffset: 1 }),
    );

    expect(state.projects).toEqual([project]);
    expect(state.loading).toBe(false);
    expect(state.hasMore).toBe(false);
  });

  it('stores summary on success', () => {
    const summary = {
      projectId: 'p-1',
      totalTrackedMinutes: 60,
      unbilledMinutes: 30,
      openBillableAmountNet: 50,
      billedAmountNet: 100,
      openTicketCount: 2,
      doneTicketCount: 1,
      milestoneCount: 1,
      openMilestoneCount: 0,
    };
    const state = projectsReducer(initialProjectsState, loadProjectSummarySuccess({ summary }));

    expect(state.summary).toEqual(summary);
    expect(state.loadingSummary).toBe(false);
  });

  it('updates selected project targetHours on admin update success', () => {
    const withTarget = { ...project, targetHours: 40 };
    const loaded = projectsReducer(initialProjectsState, loadProjectDetailSuccess({ project: withTarget }));
    const updated = projectsReducer(loaded, updateAdminProjectSuccess({ project: { ...withTarget, targetHours: 20 } }));

    expect(updated.selectedProject?.targetHours).toBe(20);
  });

  it('prepends admin project on create success', () => {
    const state = projectsReducer({ ...initialProjectsState, creating: true }, createAdminProjectSuccess({ project }));

    expect(state.creating).toBe(false);
    expect(state.adminProjects[0]).toEqual({
      ...project,
      unbilledMinutes: 0,
      openBillableAmountNet: 0,
    });
  });

  it('stores error on failure', () => {
    const state = projectsReducer({ ...initialProjectsState, loading: true }, loadProjectsFailure({ error: 'failed' }));

    expect(state.error).toBe('failed');
    expect(state.loading).toBe(false);
  });

  it('updates admin project on success', () => {
    const state = projectsReducer(
      { ...initialProjectsState, adminProjects: [project], updating: true },
      updateAdminProjectSuccess({ project: { ...project, name: 'Beta' } }),
    );

    expect(state.adminProjects[0].name).toBe('Beta');
    expect(state.updating).toBe(false);
  });

  it('removes admin project on delete success', () => {
    const state = projectsReducer(
      { ...initialProjectsState, adminProjects: [project], deleting: true },
      deleteAdminProjectSuccess({ projectId: 'p-1' }),
    );

    expect(state.adminProjects).toEqual([]);
    expect(state.deleting).toBe(false);
  });

  it('sets billing flag', () => {
    const billing = projectsReducer(
      initialProjectsState,
      billProjectTime({
        projectId: 'p-1',
        dto: { from: '2026-06-01T08:00:00.000Z', to: '2026-06-01T17:00:00.000Z' },
      }),
    );
    const done = projectsReducer(
      billing,
      billProjectTimeSuccess({ projectId: 'p-1', result: { invoiceId: 'i-1', billedMinutes: 30, amountNet: 50 } }),
    );

    expect(billing.billing).toBe(true);
    expect(done.billing).toBe(false);
  });

  it('appends on load more success', () => {
    const more = projectsReducer(
      { ...initialProjectsState, projects: [project], appendLoading: true },
      loadMoreProjectsSuccess({ projects: [project], hasMore: false, nextOffset: 2 }),
    );
    const adminMore = projectsReducer(
      { ...initialProjectsState, adminProjects: [project], adminAppendLoading: true },
      loadMoreAdminProjectsSuccess({ adminProjects: [project], hasMore: false, nextOffset: 2 }),
    );

    expect(more.projects).toEqual([project, project]);
    expect(more.appendLoading).toBe(false);
    expect(adminMore.adminProjects).toEqual([project, project]);
    expect(adminMore.adminAppendLoading).toBe(false);
  });

  it('sets appendLoading on loadMoreProjects and loadMoreAdminProjects', () => {
    const customer = projectsReducer(
      { ...initialProjectsState, projects: [project], hasMore: true, nextOffset: 10 },
      loadMoreProjects({ offset: 10 }),
    );
    const admin = projectsReducer(
      { ...initialProjectsState, adminProjects: [project], adminHasMore: true, adminNextOffset: 10 },
      loadMoreAdminProjects({ offset: 10 }),
    );

    expect(customer.appendLoading).toBe(true);
    expect(admin.adminAppendLoading).toBe(true);
  });

  it('loads admin projects and detail', () => {
    const loadingAdmin = projectsReducer(initialProjectsState, loadAdminProjects({}));
    const adminSuccess = projectsReducer(
      loadingAdmin,
      loadAdminProjectsSuccess({ adminProjects: [project], hasMore: false, nextOffset: 1 }),
    );
    const loadingDetail = projectsReducer(adminSuccess, loadAdminProjectDetail({ projectId: 'p-1' }));
    const detailSuccess = projectsReducer(
      loadingDetail,
      loadAdminProjectDetailSuccess({
        project: {
          ...project,
          summary: {
            projectId: 'p-1',
            totalTrackedMinutes: 0,
            unbilledMinutes: 0,
            openBillableAmountNet: 0,
            billedAmountNet: 0,
            openTicketCount: 0,
            doneTicketCount: 0,
            milestoneCount: 0,
            openMilestoneCount: 0,
          },
        },
      }),
    );

    expect(loadingAdmin.loading).toBe(true);
    expect(adminSuccess.adminProjects).toEqual([project]);
    expect(detailSuccess.selectedProject?.id).toBe('p-1');
    expect(detailSuccess.summary?.projectId).toBe('p-1');
  });

  it('loads customer project detail and summary', () => {
    const loadingDetail = projectsReducer(initialProjectsState, loadProjectDetail({ projectId: 'p-1' }));
    const detailSuccess = projectsReducer(loadingDetail, loadProjectDetailSuccess({ project }));
    const loadingSummary = projectsReducer(detailSuccess, loadProjectSummary({ projectId: 'p-1' }));
    const summaryChanged = projectsReducer(
      loadingSummary,
      projectSummaryChanged({
        summary: {
          projectId: 'p-1',
          totalTrackedMinutes: 10,
          unbilledMinutes: 5,
          openBillableAmountNet: 1,
          billedAmountNet: 2,
          openTicketCount: 1,
          doneTicketCount: 0,
          milestoneCount: 0,
          openMilestoneCount: 0,
        },
      }),
    );

    expect(detailSuccess.selectedProject).toEqual(project);
    expect(summaryChanged.loadingSummary).toBe(false);
    expect(summaryChanged.summary?.totalTrackedMinutes).toBe(10);
  });

  it('stores admin and customer failures', () => {
    const adminFailure = projectsReducer(
      { ...initialProjectsState, loading: true },
      loadAdminProjectsFailure({ error: 'admin failed' }),
    );
    const detailFailure = projectsReducer(
      { ...initialProjectsState, loadingDetail: true },
      loadProjectDetailFailure({ error: 'detail failed' }),
    );
    const summaryFailure = projectsReducer(
      { ...initialProjectsState, loadingSummary: true },
      loadProjectSummaryFailure({ error: 'summary failed' }),
    );

    expect(adminFailure.error).toBe('admin failed');
    expect(detailFailure.error).toBe('detail failed');
    expect(summaryFailure.error).toBe('summary failed');
  });

  it('tracks create, update, delete and billing failures', () => {
    const creating = projectsReducer(initialProjectsState, createAdminProject({ dto: {} as never }));
    const createFailed = projectsReducer(creating, createAdminProjectFailure({ error: 'create failed' }));
    const updating = projectsReducer(initialProjectsState, updateAdminProject({ projectId: 'p-1', dto: {} }));
    const updateFailed = projectsReducer(updating, updateAdminProjectFailure({ error: 'update failed' }));
    const deleting = projectsReducer(initialProjectsState, deleteAdminProject({ projectId: 'p-1' }));
    const deleteFailed = projectsReducer(deleting, deleteAdminProjectFailure({ error: 'delete failed' }));
    const billFailed = projectsReducer(
      { ...initialProjectsState, billing: true },
      billProjectTimeFailure({ error: 'bill failed' }),
    );

    expect(createFailed.creating).toBe(false);
    expect(updateFailed.updating).toBe(false);
    expect(deleteFailed.deleting).toBe(false);
    expect(billFailed.billing).toBe(false);
    expect(billFailed.error).toBe('bill failed');
  });

  it('clears error', () => {
    const state = projectsReducer({ ...initialProjectsState, error: 'x' }, clearProjectsError());

    expect(state.error).toBeNull();
  });
});
