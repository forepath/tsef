import type {
  ContributorNavItem,
  ContributorNgrxRegistration,
  ContributorUiModule,
  ServiceDetailTabComponent,
} from './contributor-ui.types';

export function collectContributorTabComponents(
  modules: readonly ContributorUiModule[],
): Record<string, ServiceDetailTabComponent> {
  const registry: Record<string, ServiceDetailTabComponent> = {};

  for (const module of modules) {
    for (const [tabId, component] of Object.entries(module.tabComponents ?? {})) {
      if (registry[tabId]) {
        continue;
      }

      registry[tabId] = component;
    }
  }

  return registry;
}

export function collectContributorNgrx(modules: readonly ContributorUiModule[]): ContributorNgrxRegistration {
  return {
    facades: modules.flatMap((module) => module.ngrx?.facades ?? []),
    states: modules.flatMap((module) => module.ngrx?.states ?? []),
    effects: Object.assign({}, ...modules.map((module) => module.ngrx?.effects ?? {})),
  };
}

export function collectContributorRoutes(modules: readonly ContributorUiModule[]): {
  customer: NonNullable<NonNullable<ContributorUiModule['routes']>['customer']>;
  admin: NonNullable<NonNullable<ContributorUiModule['routes']>['admin']>;
} {
  return {
    customer: modules.flatMap((module) => module.routes?.customer ?? []),
    admin: modules.flatMap((module) => module.routes?.admin ?? []),
  };
}

export function collectContributorNavItems(modules: readonly ContributorUiModule[]): {
  customer: ContributorNavItem[];
  admin: ContributorNavItem[];
} {
  return {
    customer: modules.flatMap((module) => module.navItems?.customer ?? []),
    admin: modules.flatMap((module) => module.navItems?.admin ?? []),
  };
}
