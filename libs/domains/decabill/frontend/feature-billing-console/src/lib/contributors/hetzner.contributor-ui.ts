import type { ContributorUiModule } from './contributor-ui.types';

/** Compile-time Hetzner provider UI. Extra tabs/routes/nav ship here when added. */
export const hetznerContributorUi: ContributorUiModule = {
  tabComponents: {},
  routes: {
    customer: [],
    admin: [],
  },
  navItems: {
    customer: [],
    admin: [],
  },
};
