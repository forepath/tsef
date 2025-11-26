import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsController } from './clients.controller';
import { ClientsVcsController } from './clients-vcs.controller';
import { ClientEntity } from './entities/client.entity';
import { ClientsRepository } from './repositories/clients.repository';
import { ClientAgentCredentialEntity } from './entities/client-agent-credential.entity';
import { ClientAgentCredentialsRepository } from './repositories/client-agent-credentials.repository';
import { ClientAgentCredentialsService } from './services/client-agent-credentials.service';
import { ClientsGateway } from './clients.gateway';
import { ClientAgentFileSystemProxyService } from './services/client-agent-file-system-proxy.service';
import { ClientAgentProxyService } from './services/client-agent-proxy.service';
import { ClientAgentVcsProxyService } from './services/client-agent-vcs-proxy.service';
import { ClientsService } from './services/clients.service';
import { KeycloakTokenService } from './services/keycloak-token.service';
import { ProvisioningService } from './services/provisioning.service';
import { ProvisioningProviderFactory } from './providers/provisioning-provider.factory';
import { HetznerProvider } from './providers/hetzner.provider';
import { ProvisioningReferenceEntity } from './entities/provisioning-reference.entity';
import { ProvisioningReferencesRepository } from './repositories/provisioning-references.repository';

/**
 * Module for agent clients feature.
 * Provides controllers, services, and repository for agent CRUD operations and file system operations.
 */
@Module({
  imports: [TypeOrmModule.forFeature([ClientEntity, ClientAgentCredentialEntity, ProvisioningReferenceEntity])],
  controllers: [ClientsController, ClientsVcsController],
  providers: [
    ClientsService,
    ClientsRepository,
    KeycloakTokenService,
    ClientAgentProxyService,
    ClientAgentFileSystemProxyService,
    ClientAgentVcsProxyService,
    ClientAgentCredentialsRepository,
    ClientAgentCredentialsService,
    ClientsGateway,
    ProvisioningService,
    ProvisioningProviderFactory,
    ProvisioningReferencesRepository,
    HetznerProvider,
    {
      provide: 'PROVISIONING_PROVIDERS',
      useFactory: (factory: ProvisioningProviderFactory, hetzner: HetznerProvider) => {
        factory.registerProvider(hetzner);
        return factory;
      },
      inject: [ProvisioningProviderFactory, HetznerProvider],
    },
  ],
  exports: [
    ClientsService,
    ClientsRepository,
    KeycloakTokenService,
    ClientAgentProxyService,
    ClientAgentFileSystemProxyService,
    ClientAgentVcsProxyService,
    ClientAgentCredentialsRepository,
    ClientAgentCredentialsService,
    ClientsGateway,
    ProvisioningService,
    ProvisioningProviderFactory,
  ],
})
export class ClientsModule {}
