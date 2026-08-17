import { containerManagerContributorUi } from './container-manager.contributor-ui';
import type { ContributorUiModule } from './contributor-ui.types';

/** Compile-time first-party contributor UI. Unknown Angular bundles cannot be loaded at runtime. */
export const FIRST_PARTY_CONTRIBUTOR_UI_MODULES: readonly ContributorUiModule[] = [containerManagerContributorUi];
