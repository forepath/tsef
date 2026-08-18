import {
  BillingIdentityNotificationBridgeModule,
  BillingKeycloakUserSyncModule,
  BillingModule,
  BillingPatAuthModule,
  BillingUsersAuthModule,
  DecabillOtelModule,
  type RegisteredContributorNestModule,
} from '@forepath/decabill/backend';
import {
  BullBoardSkippingThrottlerGuard,
  getAuthenticationMethod,
  getHybridAuthGuards,
  getKeycloakPatAuthGuards,
  getRateLimitConfig,
  KeycloakModule,
  KeycloakService,
} from '@forepath/identity/backend';
import { getTypeOrmOptionsForQueueRole, MonitoringModule } from '@forepath/shared/backend';
import { DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeycloakConnectModule } from 'nest-keycloak-connect';

import { BillingQueueModule } from '../queue/billing-queue.module';
import { typeormConfig } from '../typeorm.config';

const authMethod = getAuthenticationMethod();

@Module({})
export class AppModule {
  static register(extra: RegisteredContributorNestModule[] = []): DynamicModule {
    const billing = BillingModule.withContributors(extra);

    return {
      module: AppModule,
      imports: [
        TypeOrmModule.forRoot(getTypeOrmOptionsForQueueRole(typeormConfig)),
        BillingQueueModule.register(),
        ThrottlerModule.forRoot(getRateLimitConfig()),
        billing,
        BillingIdentityNotificationBridgeModule,
        ...(authMethod === 'keycloak'
          ? [
              KeycloakModule,
              KeycloakConnectModule.registerAsync({ useExisting: KeycloakService }),
              BillingKeycloakUserSyncModule,
              BillingPatAuthModule,
            ]
          : []),
        ...(authMethod === 'users' ? [BillingUsersAuthModule] : []),
        DecabillOtelModule,
        MonitoringModule,
      ],
      providers: [
        ...(authMethod === 'keycloak' ? getKeycloakPatAuthGuards() : getHybridAuthGuards()),
        {
          provide: APP_GUARD,
          useClass: BullBoardSkippingThrottlerGuard,
        },
      ],
    };
  }
}
