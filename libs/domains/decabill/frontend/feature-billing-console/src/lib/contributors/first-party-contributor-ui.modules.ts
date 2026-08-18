import { agenstraControllerContributorUi } from './agenstra-controller.contributor-ui';
import { agenstraManagerContributorUi } from './agenstra-manager.contributor-ui';
import { containerManagerContributorUi } from './container-manager.contributor-ui';
import type { ContributorUiModule } from './contributor-ui.types';
import { decabillBillingContributorUi } from './decabill-billing.contributor-ui';

/** Compile-time first-party contributor UI. Unknown Angular bundles cannot be loaded at runtime. */
export const FIRST_PARTY_CONTRIBUTOR_UI_MODULES: readonly ContributorUiModule[] = [
  containerManagerContributorUi,
  agenstraControllerContributorUi,
  agenstraManagerContributorUi,
  decabillBillingContributorUi,
];
