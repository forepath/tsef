import { of, throwError } from 'rxjs';
import { provideMockStore } from '@ngrx/store/testing';
import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';

import { FilterRulesService } from '../../services/filter-rules.service';

import {
  loadFilterRules,
  loadFilterRulesFailure,
  loadFilterRulesSuccess,
  loadMoreFilterRules,
  loadMoreFilterRulesFailure,
  loadMoreFilterRulesSuccess,
} from './filter-rules.actions';
import { loadFilterRules$, loadMoreFilterRules$ } from './filter-rules.effects';
import { initialFilterRulesState } from './filter-rules.reducer';
import type { FilterRuleResponseDto } from './filter-rules.types';

describe('FilterRulesEffects', () => {
  const mockRule = (id: string): FilterRuleResponseDto => ({
    id,
    pattern: 'p',
    regexFlags: 'g',
    direction: 'incoming',
    filterType: 'none',
    priority: 0,
    enabled: true,
    isGlobal: true,
    workspaceIds: [],
    sync: { pending: 0, synced: 0, failed: 0 },
    workspaceSync: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  });

  describe('loadFilterRules$', () => {
    it('dispatches success with empty list when API returns no rows', (done) => {
      const svc = { list: jest.fn().mockReturnValue(of([])) } as unknown as FilterRulesService;

      loadFilterRules$(of(loadFilterRules()), svc).subscribe((result) => {
        expect(result).toEqual(loadFilterRulesSuccess({ rules: [], hasMore: false, nextOffset: 0 }));
        expect(svc.list).toHaveBeenCalledWith({ limit: 10, offset: 0 });
        done();
      });
    });

    it('dispatches success when first page is partial', (done) => {
      const rules = [mockRule('a')];
      const svc = { list: jest.fn().mockReturnValue(of(rules)) } as unknown as FilterRulesService;

      loadFilterRules$(of(loadFilterRules()), svc).subscribe((result) => {
        expect(result).toEqual(loadFilterRulesSuccess({ rules, hasMore: false, nextOffset: 1 }));
        expect(svc.list).toHaveBeenCalledWith({ limit: 10, offset: 0 });
        done();
      });
    });

    it('sets hasMore when first page is full', (done) => {
      const rules = Array.from({ length: 10 }, (_, i) => mockRule(`id-${i}`));
      const svc = { list: jest.fn().mockReturnValue(of(rules)) } as unknown as FilterRulesService;

      loadFilterRules$(of(loadFilterRules()), svc).subscribe((result) => {
        expect(result).toEqual(loadFilterRulesSuccess({ rules, hasMore: true, nextOffset: 10 }));
        expect(svc.list).toHaveBeenCalledWith({ limit: 10, offset: 0 });
        done();
      });
    });

    it('dispatches failure on error', (done) => {
      const svc = {
        list: jest.fn().mockReturnValue(throwError(() => new Error('network'))),
      } as unknown as FilterRulesService;

      loadFilterRules$(of(loadFilterRules()), svc).subscribe((result) => {
        expect(result).toEqual(loadFilterRulesFailure({ error: 'network' }));
        done();
      });
    });
  });

  describe('loadMoreFilterRules$', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          provideMockStore({
            initialState: {
              filterRules: {
                ...initialFilterRulesState,
                hasMore: true,
                nextOffset: 10,
                loading: false,
                appendLoading: false,
              },
            },
          }),
        ],
      });
    });

    it('appends the next page', (done) => {
      const page = [mockRule('b')];
      const svc = { list: jest.fn().mockReturnValue(of(page)) } as unknown as FilterRulesService;
      const store = TestBed.inject(Store);

      loadMoreFilterRules$(of(loadMoreFilterRules()), svc, store).subscribe((result) => {
        expect(result).toEqual(loadMoreFilterRulesSuccess({ rules: page, hasMore: false, nextOffset: 11 }));
        expect(svc.list).toHaveBeenCalledWith({ limit: 10, offset: 10 });
        done();
      });
    });

    it('dispatches failure on error', (done) => {
      const svc = {
        list: jest.fn().mockReturnValue(throwError(() => new Error('network'))),
      } as unknown as FilterRulesService;
      const store = TestBed.inject(Store);

      loadMoreFilterRules$(of(loadMoreFilterRules()), svc, store).subscribe((result) => {
        expect(result).toEqual(loadMoreFilterRulesFailure({ error: 'network' }));
        done();
      });
    });
  });
});
