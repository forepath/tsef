import type { AddonResponse } from '../../types/billing.types';

import {
  clearSelectedAddon,
  createAddon,
  createAddonFailure,
  createAddonSuccess,
  deleteAddon,
  deleteAddonFailure,
  deleteAddonSuccess,
  loadAddon,
  loadAddonFailure,
  loadAddons,
  loadAddonsBatch,
  loadAddonsFailure,
  loadAddonsSuccess,
  loadAddonSuccess,
  updateAddon,
  updateAddonFailure,
  updateAddonSuccess,
} from './addons.actions';
import { addonsReducer, initialAddonsState } from './addons.reducer';

describe('addonsReducer', () => {
  const addon: AddonResponse = {
    id: 'addon-1',
    key: 'backup',
    name: 'Backup',
    implementationType: 'module',
    moduleKey: 'backup',
    configSchema: {},
    compatibleProviders: ['hetzner'],
    basePrice: '5.00',
    priceIntervalType: 'month',
    priceIntervalValue: 1,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  it('returns the initial state', () => {
    expect(addonsReducer(undefined, { type: 'UNKNOWN' } as never)).toEqual(initialAddonsState);
  });

  it('loads addons', () => {
    const loading = addonsReducer(initialAddonsState, loadAddons({}));
    const batched = addonsReducer(loading, loadAddonsBatch({ offset: 10, accumulatedAddons: [addon] }));
    const loaded = addonsReducer(batched, loadAddonsSuccess({ addons: [addon] }));

    expect(loading.loading).toBe(true);
    expect(batched.entities).toEqual([addon]);
    expect(loaded.entities).toEqual([addon]);
    expect(loaded.loading).toBe(false);
  });

  it('stores load failures', () => {
    const state = addonsReducer({ ...initialAddonsState, loading: true }, loadAddonsFailure({ error: 'Load failed' }));

    expect(state.error).toBe('Load failed');
    expect(state.loading).toBe(false);
  });

  it('loads a single addon into selection and entities', () => {
    const loading = addonsReducer(initialAddonsState, loadAddon({ id: addon.id }));
    const loaded = addonsReducer(loading, loadAddonSuccess({ addon }));
    const replaced = addonsReducer(loaded, loadAddonSuccess({ addon: { ...addon, name: 'Replaced' } }));
    const failed = addonsReducer(replaced, loadAddonFailure({ error: 'Missing' }));

    expect(loading.loadingAddon).toBe(true);
    expect(loaded.selectedAddon).toEqual(addon);
    expect(loaded.entities).toEqual([addon]);
    expect(replaced.entities[0].name).toBe('Replaced');
    expect(failed.error).toBe('Missing');
    expect(failed.loadingAddon).toBe(false);
  });

  it('adds, updates, and deletes addons', () => {
    const creating = addonsReducer(initialAddonsState, createAddon({ addon: {} as never }));
    const created = addonsReducer(creating, createAddonSuccess({ addon }));
    const createFailed = addonsReducer(creating, createAddonFailure({ error: 'Create failed' }));
    const updating = addonsReducer(created, updateAddon({ id: addon.id, addon: { name: 'Managed backup' } }));
    const updatedAddon = { ...addon, name: 'Managed backup' };
    const updated = addonsReducer(updating, updateAddonSuccess({ addon: updatedAddon }));
    const updateFailed = addonsReducer(updating, updateAddonFailure({ error: 'Update failed' }));
    const deleting = addonsReducer(updated, deleteAddon({ id: addon.id }));
    const deleted = addonsReducer(deleting, deleteAddonSuccess({ id: addon.id }));
    const deleteFailed = addonsReducer(deleting, deleteAddonFailure({ error: 'Delete failed' }));
    const cleared = addonsReducer(created, clearSelectedAddon());

    expect(creating.creating).toBe(true);
    expect(created.entities).toEqual([addon]);
    expect(createFailed.error).toBe('Create failed');
    expect(updating.updating).toBe(true);
    expect(updated.entities).toEqual([updatedAddon]);
    expect(updated.selectedAddon).toEqual(updatedAddon);
    expect(updateFailed.error).toBe('Update failed');
    expect(deleting.deleting).toBe(true);
    expect(deleted.entities).toEqual([]);
    expect(deleted.selectedAddon).toBeNull();
    expect(deleteFailed.error).toBe('Delete failed');
    expect(cleared.selectedAddon).toBeNull();
  });
});
