import type { Type } from '@angular/core';
import type { Route } from '@angular/router';
import type { ActionReducer } from '@ngrx/store';

/** Component contract for any contributor-registered service-detail tab. */
export type ServiceDetailTabComponent = Type<{
  subscriptionId: string;
  itemId: string;
  adminMode: boolean;
}>;

export interface ContributorNavItem {
  activePaths: string[];
  icon: string;
  label: string;
  navKey?: string;
  routerLink: string[];
  title: string;
}

export interface ContributorNgrxRegistration {
  facades: Type<unknown>[];
  states: Array<{ name: string; reducer: ActionReducer<unknown> }>;
  effects: Record<string, unknown>;
}

export interface ContributorUiModule {
  tabComponents?: Record<string, ServiceDetailTabComponent>;
  ngrx?: ContributorNgrxRegistration;
  routes?: { customer?: Route[]; admin?: Route[] };
  navItems?: { customer?: ContributorNavItem[]; admin?: ContributorNavItem[] };
}
