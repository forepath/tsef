import {
  CONTAINER_MANAGER_ADDON_KEY,
  ensureAddonIdInPlanLists,
  mergeOrderAddonIds,
  parsePlanAllowedAddonIds,
  parsePlanMandatoryAddonIds,
  planHasIntegratedProvisioning,
  planHasMandatoryAddonId,
  reconcilePlanAddonIdLists,
  withPlanAllowedAddonIds,
  withPlanMandatoryAddonIds,
} from './plan-addons.utils';

describe('plan-addons.utils', () => {
  it('parses unique allowed and mandatory addon ids', () => {
    const defaults = {
      allowedAddonIds: ['a', 'a', 'b', 1, ''],
      mandatoryAddonIds: ['a', 'a', 'missing'],
    };

    expect(parsePlanAllowedAddonIds(defaults)).toEqual(['a', 'b']);
    expect(parsePlanMandatoryAddonIds(defaults)).toEqual(['a', 'missing']);
  });

  it('writes and reconciles mandatory as subset of allowed', () => {
    let next = withPlanAllowedAddonIds({}, ['id-1', 'id-2']);

    next = withPlanMandatoryAddonIds(next, ['id-1', 'id-3']);
    expect(parsePlanMandatoryAddonIds(next)).toEqual(['id-1']);

    next = reconcilePlanAddonIdLists({
      allowedAddonIds: ['id-2'],
      mandatoryAddonIds: ['id-1', 'id-2'],
    });
    expect(parsePlanAllowedAddonIds(next)).toEqual(['id-2']);
    expect(parsePlanMandatoryAddonIds(next)).toEqual(['id-2']);
  });

  it('merges mandatory addon ids into order selection', () => {
    expect(
      mergeOrderAddonIds(['optional'], {
        allowedAddonIds: ['mandatory', 'optional'],
        mandatoryAddonIds: ['mandatory'],
      }),
    ).toEqual(['mandatory', 'optional']);

    expect(
      mergeOrderAddonIds([], {
        mandatoryAddonIds: ['mandatory'],
        allowedAddonIds: ['mandatory'],
      }),
    ).toEqual(['mandatory']);

    expect(
      mergeOrderAddonIds(['optional'], {
        allowedAddonIds: ['optional'],
        mandatoryAddonIds: ['orphan-mandatory'],
      }),
    ).toEqual(['optional']);
  });

  it('detects integrated provisioning and ensures addon id lists', () => {
    expect(
      planHasIntegratedProvisioning({
        provisioningOptions: [{ type: 'integrated', service: 'agenstra-controller' }],
      }),
    ).toBe(true);

    expect(
      planHasIntegratedProvisioning({
        provisioningOptions: [{ type: 'custom', cloudInitConfigId: 'cfg-1' }],
      }),
    ).toBe(false);

    const next = ensureAddonIdInPlanLists({}, 'cm-1', { mandatory: true });

    expect(parsePlanAllowedAddonIds(next)).toEqual(['cm-1']);
    expect(planHasMandatoryAddonId(next, 'cm-1')).toBe(true);
    expect(CONTAINER_MANAGER_ADDON_KEY).toBe('container-manager');
  });
});
