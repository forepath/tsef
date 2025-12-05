import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsVcsController } from './clients-vcs.controller';
import { ClientsController } from './clients.controller';
import { ClientsGateway } from './clients.gateway';
import { ClientAgentCredentialEntity } from './entities/client-agent-credential.entity';
import { ClientEntity } from './entities/client.entity';
import { ProvisioningReferenceEntity } from './entities/provisioning-reference.entity';
import { DigitalOceanProvider } from './providers/digital-ocean.provider';
import { HetznerProvider } from './providers/hetzner.provider';
import { ProvisioningProviderFactory } from './providers/provisioning-provider.factory';
import { ClientAgentCredentialsRepository } from './repositories/client-agent-credentials.repository';
import { ClientsRepository } from './repositories/clients.repository';
import { ProvisioningReferencesRepository } from './repositories/provisioning-references.repository';
import { ClientAgentCredentialsService } from './services/client-agent-credentials.service';
import { ClientAgentFileSystemProxyService } from './services/client-agent-file-system-proxy.service';
import { ClientAgentProxyService } from './services/client-agent-proxy.service';
import { ClientAgentVcsProxyService } from './services/client-agent-vcs-proxy.service';
import { ClientsService } from './services/clients.service';
import { KeycloakTokenService } from './services/keycloak-token.service';
import { ProvisioningService } from './services/provisioning.service';

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
    DigitalOceanProvider,
    {
      provide: 'PROVISIONING_PROVIDERS',
      useFactory: (
        factory: ProvisioningProviderFactory,
        hetzner: HetznerProvider,
        digitalOcean: DigitalOceanProvider,
      ) => {
        factory.registerProvider(hetzner);
        factory.registerProvider(digitalOcean);
        return factory;
      },
      inject: [ProvisioningProviderFactory, HetznerProvider, DigitalOceanProvider],
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
