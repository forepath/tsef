import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';

import type { AddonResponse, CreateAddonDto, ListParams, UpdateAddonDto } from '../../types/billing.types';

import { clearSelectedAddon, createAddon, deleteAddon, loadAddon, loadAddons, updateAddon } from './addons.actions';
import { AddonsFacade } from './addons.facade';

describe('AddonsFacade', () => {
  let facade: AddonsFacade;
  let store: jest.Mocked<Store>;
  const mockAddon: AddonResponse = {
    id: 'addon-1',
    key: 'backup',
    name: 'Backup',
    implementationType: 'module',
    moduleKey: 'backup',
    configSchema: {},
    compatibleProviders: [],
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    store = { select: jest.fn(), dispatch: jest.fn() } as never;

    TestBed.configureTestingModule({
      providers: [AddonsFacade, { provide: Store, useValue: store }],
    });

    facade = TestBed.inject(AddonsFacade);
  });

  describe('State Observables', () => {
    it('returns addons observable', (done) => {
      store.select.mockReturnValue(of([mockAddon]));
      facade.getAddons$().subscribe((result) => {
        expect(result).toEqual([mockAddon]);
        done();
      });
    });

    it('returns active addons observable', (done) => {
      store.select.mockReturnValue(of([mockAddon]));
      facade.getActiveAddons$().subscribe((result) => {
        expect(result).toEqual([mockAddon]);
        done();
      });
    });

    it('returns selected addon observable', (done) => {
      store.select.mockReturnValue(of(mockAddon));
      facade.getSelectedAddon$().subscribe((result) => {
        expect(result).toEqual(mockAddon);
        done();
      });
    });

    it('returns loading observables', (done) => {
      store.select.mockReturnValue(of(true));
      facade.getAddonsLoading$().subscribe((result) => {
        expect(result).toBe(true);
        done();
      });
    });

    it('returns addon loading observable', (done) => {
      store.select.mockReturnValue(of(true));
      facade.getAddonLoading$().subscribe((result) => {
        expect(result).toBe(true);
        done();
      });
    });

    it('returns creating observable', (done) => {
      store.select.mockReturnValue(of(true));
      facade.getAddonsCreating$().subscribe((result) => {
        expect(result).toBe(true);
        done();
      });
    });

    it('returns updating observable', (done) => {
      store.select.mockReturnValue(of(true));
      facade.getAddonsUpdating$().subscribe((result) => {
        expect(result).toBe(true);
        done();
      });
    });

    it('returns deleting observable', (done) => {
      store.select.mockReturnValue(of(true));
      facade.getAddonsDeleting$().subscribe((result) => {
        expect(result).toBe(true);
        done();
      });
    });

    it('returns loading any observable', (done) => {
      store.select.mockReturnValue(of(true));
      facade.getAddonsLoadingAny$().subscribe((result) => {
        expect(result).toBe(true);
        done();
      });
    });

    it('returns error observable', (done) => {
      store.select.mockReturnValue(of('Load failed'));
      facade.getAddonsError$().subscribe((result) => {
        expect(result).toBe('Load failed');
        done();
      });
    });
  });

  describe('Action Methods', () => {
    it('dispatches loadAddons', () => {
      const params: ListParams = { limit: 10 };

      facade.loadAddons(params);
      expect(store.dispatch).toHaveBeenCalledWith(loadAddons({ params }));
    });

    it('dispatches loadAddon', () => {
      facade.loadAddon('addon-1');
      expect(store.dispatch).toHaveBeenCalledWith(loadAddon({ id: 'addon-1' }));
    });

    it('dispatches createAddon', () => {
      const dto: CreateAddonDto = {
        key: 'backup',
        name: 'Backup',
        implementationType: 'module',
        moduleKey: 'backup',
      };

      facade.createAddon(dto);
      expect(store.dispatch).toHaveBeenCalledWith(createAddon({ addon: dto }));
    });

    it('dispatches updateAddon', () => {
      const dto: UpdateAddonDto = { name: 'Updated' };

      facade.updateAddon('addon-1', dto);
      expect(store.dispatch).toHaveBeenCalledWith(updateAddon({ id: 'addon-1', addon: dto }));
    });

    it('dispatches deleteAddon', () => {
      facade.deleteAddon('addon-1');
      expect(store.dispatch).toHaveBeenCalledWith(deleteAddon({ id: 'addon-1' }));
    });

    it('dispatches clearSelectedAddon', () => {
      facade.clearSelectedAddon();
      expect(store.dispatch).toHaveBeenCalledWith(clearSelectedAddon());
    });
  });
});
