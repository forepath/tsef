import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsController } from './clients.controller';
import { ClientEntity } from './entities/client.entity';
import { ClientsRepository } from './repositories/clients.repository';
import { ClientAgentCredentialEntity } from './entities/client-agent-credential.entity';
import { ClientAgentCredentialsRepository } from './repositories/client-agent-credentials.repository';
import { ClientAgentCredentialsService } from './services/client-agent-credentials.service';
import { ClientsGateway } from './clients.gateway';
import { ClientAgentProxyService } from './services/client-agent-proxy.service';
import { ClientsService } from './services/clients.service';
import { KeycloakTokenService } from './services/keycloak-token.service';

/**
 * Module for agent clients feature.
 * Provides controllers, services, and repository for agent CRUD operations.
 */
@Module({
  imports: [TypeOrmModule.forFeature([ClientEntity, ClientAgentCredentialEntity])],
  controllers: [ClientsController],
  providers: [
    ClientsService,
    ClientsRepository,
    KeycloakTokenService,
    ClientAgentProxyService,
    ClientAgentCredentialsRepository,
    ClientAgentCredentialsService,
    ClientsGateway,
  ],
  exports: [
    ClientsService,
    ClientsRepository,
    KeycloakTokenService,
    ClientAgentProxyService,
    ClientAgentCredentialsRepository,
    ClientAgentCredentialsService,
    ClientsGateway,
  ],
})
export class ClientsModule {}
