import type { PlanAddonOptionDto } from '../types/billing.types';

import { mergeMandatoryOrderAddonIds } from './merge-mandatory-order-addon-ids.util';

describe('mergeMandatoryOrderAddonIds', () => {
  const options: PlanAddonOptionDto[] = [
    {
      id: 'addon-mandatory',
      key: 'container-manager',
      name: 'Container Manager',
      implementationType: 'module',
      periodPrice: 0,
      orderFields: [],
      mandatory: true,
    },
    {
      id: 'addon-optional',
      key: 'backup',
      name: 'Backup',
      implementationType: 'script',
      periodPrice: 5,
      orderFields: [],
      mandatory: false,
    },
  ];

  it('includes mandatory ids even when not selected', () => {
    expect(mergeMandatoryOrderAddonIds([], options)).toEqual(['addon-mandatory']);
  });

  it('merges selected optional ids without duplicating mandatory', () => {
    expect(mergeMandatoryOrderAddonIds(['addon-optional', 'addon-mandatory'], options)).toEqual([
      'addon-mandatory',
      'addon-optional',
    ]);
  });

  it('ignores empty and duplicate selected ids', () => {
    expect(mergeMandatoryOrderAddonIds(['', 'addon-optional', 'addon-optional'], options)).toEqual([
      'addon-mandatory',
      'addon-optional',
    ]);
  });
});
