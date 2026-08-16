import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { take } from 'rxjs';

import type { BillProjectTimeDto, CreateAdminProjectDto, UpdateAdminProjectDto } from '../../types/projects.types';

import {
  billProjectTime,
  clearProjectsError,
  createAdminProject,
  deleteAdminProject,
  loadAdminProjectDetail,
  loadAdminProjects,
  loadMoreAdminProjects,
  loadMoreProjects,
  loadProjectDetail,
  loadProjects,
  loadProjectSummary,
  updateAdminProject,
} from './projects.actions';
import {
  selectAdminProjects,
  selectAdminProjectsAppendError,
  selectAdminProjectsAppendLoading,
  selectAdminProjectsHasMore,
  selectCustomerProjects,
  selectProjectSummary,
  selectProjectsAppendError,
  selectProjectsAppendLoading,
  selectProjectsBilling,
  selectProjectsCreating,
  selectProjectsDeleting,
  selectProjectsError,
  selectProjectsHasMore,
  selectProjectsLoading,
  selectProjectsLoadingDetail,
  selectProjectsLoadingSummary,
  selectProjectsState,
  selectProjectsUpdating,
  selectSelectedProject,
} from './projects.selectors';

@Injectable()
export class ProjectsFacade {
  private readonly store = inject(Store);

  readonly projects$ = this.store.select(selectCustomerProjects);
  readonly adminProjects$ = this.store.select(selectAdminProjects);
  readonly selectedProject$ = this.store.select(selectSelectedProject);
  readonly summary$ = this.store.select(selectProjectSummary);
  readonly loading$ = this.store.select(selectProjectsLoading);
  readonly loadingDetail$ = this.store.select(selectProjectsLoadingDetail);
  readonly loadingSummary$ = this.store.select(selectProjectsLoadingSummary);
  readonly creating$ = this.store.select(selectProjectsCreating);
  readonly updating$ = this.store.select(selectProjectsUpdating);
  readonly deleting$ = this.store.select(selectProjectsDeleting);
  readonly billing$ = this.store.select(selectProjectsBilling);
  readonly error$ = this.store.select(selectProjectsError);
  readonly hasMore$ = this.store.select(selectProjectsHasMore);
  readonly appendLoading$ = this.store.select(selectProjectsAppendLoading);
  readonly appendError$ = this.store.select(selectProjectsAppendError);
  readonly adminHasMore$ = this.store.select(selectAdminProjectsHasMore);
  readonly adminAppendLoading$ = this.store.select(selectAdminProjectsAppendLoading);
  readonly adminAppendError$ = this.store.select(selectAdminProjectsAppendError);

  loadProjects(): void {
    this.store.dispatch(loadProjects({}));
  }

  loadMore(): void {
    this.store
      .select(selectProjectsState)
      .pipe(take(1))
      .subscribe((state) => {
        if (!state.hasMore || state.appendLoading || state.loading) return;

        this.store.dispatch(loadMoreProjects({ offset: state.nextOffset }));
      });
  }

  loadProjectDetail(projectId: string): void {
    this.store.dispatch(loadProjectDetail({ projectId }));
  }

  loadProjectSummary(projectId: string): void {
    this.store.dispatch(loadProjectSummary({ projectId }));
  }

  loadAdminProjects(params?: { search?: string; userId?: string }): void {
    this.store.dispatch(loadAdminProjects(params ?? {}));
  }

  loadMoreAdminProjects(): void {
    this.store
      .select(selectProjectsState)
      .pipe(take(1))
      .subscribe((state) => {
        if (!state.adminHasMore || state.adminAppendLoading || state.loading) return;

        this.store.dispatch(
          loadMoreAdminProjects({
            offset: state.adminNextOffset,
            search: state.adminSearch ?? undefined,
            userId: state.adminUserId ?? undefined,
          }),
        );
      });
  }

  loadAdminProjectDetail(projectId: string): void {
    this.store.dispatch(loadAdminProjectDetail({ projectId }));
  }

  createAdminProject(dto: CreateAdminProjectDto): void {
    this.store.dispatch(createAdminProject({ dto }));
  }

  updateAdminProject(projectId: string, dto: UpdateAdminProjectDto): void {
    this.store.dispatch(updateAdminProject({ projectId, dto }));
  }

  deleteAdminProject(projectId: string): void {
    this.store.dispatch(deleteAdminProject({ projectId }));
  }

  billProjectTime(projectId: string, dto: BillProjectTimeDto): void {
    this.store.dispatch(billProjectTime({ projectId, dto }));
  }

  clearError(): void {
    this.store.dispatch(clearProjectsError());
  }
}
