import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsController } from './clients.controller';
import { ClientEntity } from './entities/client.entity';
import { ClientsRepository } from './repositories/clients.repository';
import { ClientAgentCredentialEntity } from './entities/client-agent-credential.entity';
import { ClientAgentCredentialsRepository } from './repositories/client-agent-credentials.repository';
import { ClientAgentCredentialsService } from './services/client-agent-credentials.service';
import { ClientsGateway } from './clients.gateway';
import { ClientAgentFileSystemProxyService } from './services/client-agent-file-system-proxy.service';
import { ClientAgentProxyService } from './services/client-agent-proxy.service';
import { ClientsService } from './services/clients.service';
import { KeycloakTokenService } from './services/keycloak-token.service';

/**
 * Module for agent clients feature.
 * Provides controllers, services, and repository for agent CRUD operations and file system operations.
 */
@Module({
  imports: [TypeOrmModule.forFeature([ClientEntity, ClientAgentCredentialEntity])],
  controllers: [ClientsController],
  providers: [
    ClientsService,
    ClientsRepository,
    KeycloakTokenService,
    ClientAgentProxyService,
    ClientAgentFileSystemProxyService,
    ClientAgentCredentialsRepository,
    ClientAgentCredentialsService,
    ClientsGateway,
  ],
  exports: [
    ClientsService,
    ClientsRepository,
    KeycloakTokenService,
    ClientAgentProxyService,
    ClientAgentFileSystemProxyService,
    ClientAgentCredentialsRepository,
    ClientAgentCredentialsService,
    ClientsGateway,
  ],
})
export class ClientsModule {}
