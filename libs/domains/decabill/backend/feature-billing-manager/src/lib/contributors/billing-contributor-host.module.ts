import { Global, Module } from '@nestjs/common';

import { AddonModuleRegistryService } from '../services/addon-module-registry.service';
import { SshExecutorService } from '../services/ssh-executor.service';

/**
 * Host singletons that first-party and env-loaded contributor Nest modules inject.
 * Kept global so contributor modules do not import BillingModule (circular).
 */
@Global()
@Module({
  providers: [AddonModuleRegistryService, SshExecutorService],
  exports: [AddonModuleRegistryService, SshExecutorService],
})
export class BillingContributorHostModule {}
