import { of, throwError } from 'rxjs';

import { UpdatesService } from '../../services/updates.service';
import type { UpdatesStatusSummary } from '../../types/updates.types';

import {
  loadAdminUpdatesFull,
  loadAdminUpdatesFullFailure,
  loadAdminUpdatesFullSuccess,
  loadAdminUpdatesStatus,
  loadAdminUpdatesStatusFailure,
  loadAdminUpdatesStatusSuccess,
  triggerAdminUpdateCheck,
  triggerAdminUpdateCheckFailure,
  triggerAdminUpdateCheckSuccess,
} from './admin-updates.actions';
import {
  loadAdminUpdatesFull$,
  loadAdminUpdatesStatus$,
  pollAdminUpdatesAfterCheck$,
  triggerAdminUpdateCheck$,
} from './admin-updates.effects';

describe('AdminUpdatesEffects', () => {
  const mockStatus = (over: Partial<UpdatesStatusSummary> = {}): UpdatesStatusSummary => ({
    installedVersion: '1.0.0',
    latestVersion: '1.1.0',
    updateState: 'unknown',
    lastCheckAt: '2024-01-01T00:00:00Z',
    lastCheckStatus: 'pending',
    instanceCount: 1,
    outdatedInstanceCount: 0,
    ...over,
  });

  describe('loadAdminUpdatesStatus$', () => {
    it('dispatches success on happy path', (done) => {
      const status = mockStatus({ lastCheckStatus: 'success' });
      const svc = { getStatus: jest.fn().mockReturnValue(of(status)) } as unknown as UpdatesService;

      loadAdminUpdatesStatus$(of(loadAdminUpdatesStatus()), svc).subscribe((result) => {
        expect(result).toEqual(loadAdminUpdatesStatusSuccess({ status }));
        done();
      });
    });

    it('dispatches failure on error', (done) => {
      const svc = {
        getStatus: jest.fn().mockReturnValue(throwError(() => new Error('network'))),
      } as unknown as UpdatesService;

      loadAdminUpdatesStatus$(of(loadAdminUpdatesStatus()), svc).subscribe((result) => {
        expect(result).toEqual(loadAdminUpdatesStatusFailure({ error: 'network' }));
        done();
      });
    });
  });

  describe('loadAdminUpdatesFull$', () => {
    it('dispatches success on happy path', (done) => {
      const fullState = {
        ...mockStatus(),
        release: null,
        instances: [],
        scopedChangelog: { product: [], shared: [] },
      };
      const svc = { getFullState: jest.fn().mockReturnValue(of(fullState)) } as unknown as UpdatesService;

      loadAdminUpdatesFull$(of(loadAdminUpdatesFull()), svc).subscribe((result) => {
        expect(result).toEqual(loadAdminUpdatesFullSuccess({ fullState }));
        done();
      });
    });

    it('dispatches failure on error', (done) => {
      const svc = {
        getFullState: jest.fn().mockReturnValue(throwError(() => new Error('boom'))),
      } as unknown as UpdatesService;

      loadAdminUpdatesFull$(of(loadAdminUpdatesFull()), svc).subscribe((result) => {
        expect(result).toEqual(loadAdminUpdatesFullFailure({ error: 'boom' }));
        done();
      });
    });
  });

  describe('triggerAdminUpdateCheck$', () => {
    it('dispatches success with previous last check timestamp', (done) => {
      const svc = {
        triggerCheck: jest.fn().mockReturnValue(of({ jobId: 'job-1', enqueuedAt: '2024-01-02T00:00:00Z' })),
      } as unknown as UpdatesService;
      const store = {
        select: jest.fn().mockReturnValue(of('2024-01-01T00:00:00Z')),
      } as never;

      triggerAdminUpdateCheck$(of(triggerAdminUpdateCheck()), svc, store).subscribe((result) => {
        expect(result).toEqual(
          triggerAdminUpdateCheckSuccess({
            result: { jobId: 'job-1', enqueuedAt: '2024-01-02T00:00:00Z' },
            previousLastCheckAt: '2024-01-01T00:00:00Z',
          }),
        );
        done();
      });
    });

    it('dispatches failure on error', (done) => {
      const svc = {
        triggerCheck: jest.fn().mockReturnValue(throwError(() => new Error('queue'))),
      } as unknown as UpdatesService;
      const store = {
        select: jest.fn().mockReturnValue(of(null)),
      } as never;

      triggerAdminUpdateCheck$(of(triggerAdminUpdateCheck()), svc, store).subscribe((result) => {
        expect(result).toEqual(triggerAdminUpdateCheckFailure({ error: 'queue' }));
        done();
      });
    });
  });

  describe('pollAdminUpdatesAfterCheck$', () => {
    it('polls until check completes then reloads full state', (done) => {
      jest.useFakeTimers();

      const pending = mockStatus({ lastCheckStatus: 'pending', lastCheckAt: '2024-01-01T00:00:00Z' });
      const success = mockStatus({ lastCheckStatus: 'success', lastCheckAt: '2024-01-02T00:00:00Z' });
      const svc = {
        getStatus: jest.fn().mockReturnValueOnce(of(pending)).mockReturnValueOnce(of(success)),
      } as unknown as UpdatesService;
      const results: unknown[] = [];

      pollAdminUpdatesAfterCheck$(
        of(
          triggerAdminUpdateCheckSuccess({
            result: { jobId: 'job-1', enqueuedAt: '2024-01-02T00:00:00Z' },
            previousLastCheckAt: '2024-01-01T00:00:00Z',
          }),
        ),
        svc,
      ).subscribe({
        next: (action) => results.push(action),
        complete: () => {
          expect(results).toEqual([
            loadAdminUpdatesStatusSuccess({ status: pending }),
            loadAdminUpdatesStatusSuccess({ status: success }),
            loadAdminUpdatesFull(),
          ]);
          jest.useRealTimers();
          done();
        },
      });

      jest.advanceTimersByTime(2000);
    });
  });
});
