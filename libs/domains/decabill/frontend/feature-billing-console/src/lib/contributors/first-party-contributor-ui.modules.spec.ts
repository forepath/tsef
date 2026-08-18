import {
  CONTAINER_MANAGER_TAB_ID,
  ContainerManagerFacade,
} from '@forepath/decabill/frontend/data-access-billing-console';

import {
  collectContributorNgrx,
  collectContributorRoutes,
  collectContributorTabComponents,
} from './contributor-ui.registry';
import { FIRST_PARTY_CONTRIBUTOR_UI_MODULES } from './first-party-contributor-ui.modules';

describe('FIRST_PARTY_CONTRIBUTOR_UI_MODULES', () => {
  it('registers Container Manager tab, NgRx, and empty extra routes/nav', () => {
    const tabs = collectContributorTabComponents(FIRST_PARTY_CONTRIBUTOR_UI_MODULES);
    const ngrx = collectContributorNgrx(FIRST_PARTY_CONTRIBUTOR_UI_MODULES);
    const routes = collectContributorRoutes(FIRST_PARTY_CONTRIBUTOR_UI_MODULES);

    expect(tabs[CONTAINER_MANAGER_TAB_ID]).toBeDefined();
    expect(ngrx.facades).toContain(ContainerManagerFacade);
    expect(ngrx.states.map((state) => state.name)).toContain('containerManager');
    expect(routes.customer).toEqual([]);
    expect(routes.admin).toEqual([]);
  });
});
