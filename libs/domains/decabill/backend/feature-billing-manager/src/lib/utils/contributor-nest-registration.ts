import type { Type } from '@nestjs/common';

import { CONTAINER_MANAGER_NEST_REGISTRATION } from '../contributors/container-manager/container-manager.contributor.module';
import { registerContributorNestModules, type RegisteredContributorNestModule } from './contributor-nest.types';

export function resolveContributorNestImports(extra: RegisteredContributorNestModule[] = []): Type<unknown>[] {
  return registerContributorNestModules([CONTAINER_MANAGER_NEST_REGISTRATION, ...extra]);
}
