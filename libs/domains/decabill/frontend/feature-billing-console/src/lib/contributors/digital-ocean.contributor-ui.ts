import type { ContributorUiModule } from './contributor-ui.types';

/** Compile-time DigitalOcean provider UI. Extra tabs/routes/nav ship here when added. */
export const digitalOceanContributorUi: ContributorUiModule = {
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
