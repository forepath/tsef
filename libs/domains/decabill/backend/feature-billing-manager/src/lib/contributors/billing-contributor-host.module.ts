import { Global, Module } from '@nestjs/common';

import { AddonModuleRegistryService } from '../services/addon-module-registry.service';
import { IntegratedStackRegistryService } from '../services/integrated-stack-registry.service';
import { ProviderModuleRegistryService } from '../services/provider-module-registry.service';
import { ProviderRegistryService } from '../services/provider-registry.service';
import { SshExecutorService } from '../services/ssh-executor.service';

/**
 * Host singletons that first-party and env-loaded contributor Nest modules inject.
 * Kept global so contributor modules do not import BillingModule (circular).
 */
@Global()
@Module({
  providers: [
    AddonModuleRegistryService,
    IntegratedStackRegistryService,
    ProviderRegistryService,
    ProviderModuleRegistryService,
    SshExecutorService,
  ],
  exports: [
    AddonModuleRegistryService,
    IntegratedStackRegistryService,
    ProviderRegistryService,
    ProviderModuleRegistryService,
    SshExecutorService,
  ],
})
export class BillingContributorHostModule {}
