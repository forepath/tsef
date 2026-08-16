import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

import {
  clearFilterRulesError,
  createFilterRule,
  deleteFilterRule,
  loadFilterRules,
  loadMoreFilterRules,
  updateFilterRule,
} from './filter-rules.actions';
import {
  selectFilterRules,
  selectFilterRulesAppendError,
  selectFilterRulesAppendLoading,
  selectFilterRulesDeleting,
  selectFilterRulesError,
  selectFilterRulesHasMore,
  selectFilterRulesLoading,
  selectFilterRulesSaving,
} from './filter-rules.selectors';
import type { CreateFilterRuleDto, FilterRuleResponseDto, UpdateFilterRuleDto } from './filter-rules.types';

@Injectable({
  providedIn: 'root',
})
export class FilterRulesFacade {
  private readonly store = inject(Store);

  readonly rules$: Observable<FilterRuleResponseDto[]> = this.store.select(selectFilterRules);
  readonly loading$: Observable<boolean> = this.store.select(selectFilterRulesLoading);
  readonly error$: Observable<string | null> = this.store.select(selectFilterRulesError);
  readonly saving$: Observable<boolean> = this.store.select(selectFilterRulesSaving);
  readonly deleting$: Observable<boolean> = this.store.select(selectFilterRulesDeleting);
  readonly hasMore$: Observable<boolean> = this.store.select(selectFilterRulesHasMore);
  readonly appendLoading$: Observable<boolean> = this.store.select(selectFilterRulesAppendLoading);
  readonly appendError$: Observable<string | null> = this.store.select(selectFilterRulesAppendError);

  load(): void {
    this.store.dispatch(loadFilterRules());
  }

  loadMore(): void {
    this.store.dispatch(loadMoreFilterRules());
  }

  retryLoadMore(): void {
    this.store.dispatch(loadMoreFilterRules());
  }

  create(dto: CreateFilterRuleDto): void {
    this.store.dispatch(createFilterRule({ dto }));
  }

  update(id: string, dto: UpdateFilterRuleDto): void {
    this.store.dispatch(updateFilterRule({ id, dto }));
  }

  delete(id: string): void {
    this.store.dispatch(deleteFilterRule({ id }));
  }

  clearError(): void {
    this.store.dispatch(clearFilterRulesError());
  }
}
