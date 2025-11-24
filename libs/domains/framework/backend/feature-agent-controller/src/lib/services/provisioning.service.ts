import { BadRequestException, forwardRef, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { ProvisionServerDto } from '../dto/provision-server.dto';
import { ProvisionedServerResponseDto } from '../dto/provisioned-server-response.dto';
import { AuthenticationType } from '../entities/client.entity';
import { ProvisioningProviderFactory } from '../providers/provisioning-provider.factory';
import { ProvisioningReferencesRepository } from '../repositories/provisioning-references.repository';
import { ClientsService } from './clients.service';

/**
 * Service for orchestrating server provisioning through cloud providers.
 * Handles provider selection, server provisioning, client creation, and reference storage.
 */
@Injectable()
export class ProvisioningService {
  private readonly logger = new Logger(ProvisioningService.name);
  private readonly API_KEY_LENGTH = 32;

  constructor(
    private readonly provisioningProviderFactory: ProvisioningProviderFactory,
    @Inject(forwardRef(() => ClientsService))
    private readonly clientsService: ClientsService,
    private readonly provisioningReferencesRepository: ProvisioningReferencesRepository,
  ) {}

  /**
   * Generate a secure random API key.
   * Uses alphanumeric characters to ensure compatibility.
   * @returns A random API key string of API_KEY_LENGTH characters
   */
  private generateRandomApiKey(): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const randomBytesBuffer = randomBytes(this.API_KEY_LENGTH);
    let apiKey = '';

    for (let i = 0; i < this.API_KEY_LENGTH; i++) {
      apiKey += charset[randomBytesBuffer[i] % charset.length];
    }

    return apiKey;
  }

  /**
   * Generate user data script with authentication, GIT, and other configuration.
   * @param authenticationType - The authentication type (API_KEY or KEYCLOAK)
   * @param apiKey - The API key (for API_KEY authentication)
   * @param keycloakConfig - Keycloak configuration (for KEYCLOAK authentication)
   * @param gitConfig - Git repository configuration
   * @param cursorApiKey - Cursor API key for agent configuration
   * @param agentDefaultImage - Default image for cursor agents
   * @returns User data script string
   */
  private generateAuthUserData(
    authenticationType: AuthenticationType,
    apiKey?: string,
    keycloakConfig?: { clientId: string; clientSecret: string; realm?: string; authServerUrl?: string },
    gitConfig?: { repositoryUrl?: string; username?: string; token?: string; password?: string; privateKey?: string },
    cursorApiKey?: string,
    agentDefaultImage?: string,
  ): string {
    // Build authentication environment variables
    const authEnvVars: string[] = [];
    if (authenticationType === AuthenticationType.API_KEY) {
      if (!apiKey) {
        throw new BadRequestException('API key is required for API_KEY authentication type');
      }
      authEnvVars.push(`STATIC_API_KEY: ${apiKey}`);
    } else if (authenticationType === AuthenticationType.KEYCLOAK) {
      if (!keycloakConfig?.clientId || !keycloakConfig?.clientSecret) {
        throw new BadRequestException('Keycloak client ID and secret are required for KEYCLOAK authentication type');
      }
      const authServerUrl = keycloakConfig.authServerUrl || process.env.KEYCLOAK_AUTH_SERVER_URL || '';
      const realm = keycloakConfig.realm || process.env.KEYCLOAK_REALM || '';
      authEnvVars.push(`KEYCLOAK_AUTH_SERVER_URL: ${authServerUrl}`);
      authEnvVars.push(`KEYCLOAK_REALM: ${realm}`);
      authEnvVars.push(`KEYCLOAK_CLIENT_ID: ${keycloakConfig.clientId}`);
      authEnvVars.push(`KEYCLOAK_CLIENT_SECRET: ${keycloakConfig.clientSecret}`);
    }

    // Build GIT environment variables
    const gitEnvVars: string[] = [];
    if (gitConfig?.repositoryUrl) {
      gitEnvVars.push(`GIT_REPOSITORY_URL: ${gitConfig.repositoryUrl}`);
    }
    if (gitConfig?.username) {
      gitEnvVars.push(`GIT_USERNAME: ${gitConfig.username}`);
    }
    if (gitConfig?.token) {
      gitEnvVars.push(`GIT_TOKEN: ${gitConfig.token}`);
    }
    if (gitConfig?.password) {
      gitEnvVars.push(`GIT_PASSWORD: ${gitConfig.password}`);
    }
    if (gitConfig?.privateKey) {
      gitEnvVars.push(`GIT_PRIVATE_KEY: ${gitConfig.privateKey}`);
    }

    // Build cursor agent environment variables (only add if provided)
    const cursorEnvVars: string[] = [];
    if (cursorApiKey) {
      cursorEnvVars.push(`CURSOR_API_KEY: ${cursorApiKey}`);
    }
    if (agentDefaultImage) {
      cursorEnvVars.push(`AGENT_DEFAULT_IMAGE: ${agentDefaultImage}`);
    }

    // Combine all environment variables (dynamic variables take precedence)
    const allEnvVars = [...authEnvVars, ...gitEnvVars, ...cursorEnvVars];

    return `
# Configure agent-manager with authentication, GIT, and cursor agent configuration
# Update docker-compose.yml with environment variables
cat > /opt/agent-manager/docker-compose.yml << 'DOCKER_COMPOSE_EOF'
services:
  postgres:
    image: postgres:16-alpine
    container_name: agent-manager-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - agent-manager-network

  backend-agent-manager:
    image: ghcr.io/forepath/agenstra-manager-api:latest
    container_name: agent-manager-api
    environment:
      # Backend API configuration
      HOST: 0.0.0.0
      PORT: 3000
      WEBSOCKET_PORT: 8080
      NODE_ENV: production
      # Database configuration
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USERNAME: postgres
      DB_PASSWORD: postgres
      DB_DATABASE: postgres
${
  allEnvVars.length > 0
    ? `      # Dynamic configuration (authentication, GIT, cursor agent)
${allEnvVars.map((line) => `      ${line}`).join('\n')}`
    : ''
}
    ports:
      - "3000:3000"
      - "8080:8080"
    volumes:
      # Mount Docker socket for Docker-in-Docker functionality
      - /var/run/docker.sock:/var/run/docker.sock
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - agent-manager-network
    restart: unless-stopped

volumes:
  postgres_data:

networks:
  agent-manager-network:
    driver: bridge
DOCKER_COMPOSE_EOF
`;
  }

  /**
   * Provision a new server and create a client.
   * @param provisionServerDto - Provisioning options
   * @returns Provisioned server response with client information
   */
  async provisionServer(provisionServerDto: ProvisionServerDto): Promise<ProvisionedServerResponseDto> {
    // Get the provider
    if (!this.provisioningProviderFactory.hasProvider(provisionServerDto.providerType)) {
      throw new BadRequestException(
        `Provider type '${provisionServerDto.providerType}' is not available. Available types: ${this.provisioningProviderFactory.getRegisteredTypes().join(', ')}`,
      );
    }

    const provider = this.provisioningProviderFactory.getProvider(provisionServerDto.providerType);

    // Generate API key if needed
    let apiKey: string | undefined;
    if (provisionServerDto.authenticationType === AuthenticationType.API_KEY) {
      apiKey = provisionServerDto.apiKey || this.generateRandomApiKey();
    }

    // Generate user data with authentication, GIT, and cursor agent configuration
    const authUserData = this.generateAuthUserData(
      provisionServerDto.authenticationType,
      apiKey,
      provisionServerDto.authenticationType === AuthenticationType.KEYCLOAK
        ? {
            clientId: provisionServerDto.keycloakClientId!,
            clientSecret: provisionServerDto.keycloakClientSecret!,
            realm: provisionServerDto.keycloakRealm,
            authServerUrl: provisionServerDto.keycloakAuthServerUrl,
          }
        : undefined,
      provisionServerDto.gitRepositoryUrl ||
        provisionServerDto.gitUsername ||
        provisionServerDto.gitToken ||
        provisionServerDto.gitPassword ||
        provisionServerDto.gitPrivateKey
        ? {
            repositoryUrl: provisionServerDto.gitRepositoryUrl,
            username: provisionServerDto.gitUsername,
            token: provisionServerDto.gitToken,
            password: provisionServerDto.gitPassword,
            privateKey: provisionServerDto.gitPrivateKey,
          }
        : undefined,
      provisionServerDto.cursorApiKey,
      provisionServerDto.agentDefaultImage,
    );

    // Encode user data as base64 for passing to provider
    const encodedUserData = Buffer.from(authUserData).toString('base64');

    // Provision the server
    this.logger.log(`Provisioning server via ${provisionServerDto.providerType} provider...`);
    const provisionedServer = await provider.provisionServer({
      serverType: provisionServerDto.serverType,
      name: provisionServerDto.name,
      description: provisionServerDto.description,
      location: provisionServerDto.location,
      userData: encodedUserData,
    });

    this.logger.log(`Server provisioned: ${provisionedServer.serverId} at ${provisionedServer.endpoint}`);

    // Create client in database
    const client = await this.clientsService.create({
      name: provisionServerDto.name,
      description: provisionServerDto.description || `Provisioned via ${provisionServerDto.providerType}`,
      endpoint: provisionedServer.endpoint,
      authenticationType: provisionServerDto.authenticationType,
      apiKey,
      keycloakClientId: provisionServerDto.keycloakClientId,
      keycloakClientSecret: provisionServerDto.keycloakClientSecret,
      keycloakRealm: provisionServerDto.keycloakRealm,
      agentWsPort: provisionServerDto.agentWsPort || 8080,
    });

    // Create provisioning reference
    const reference = await this.provisioningReferencesRepository.create({
      clientId: client.id,
      providerType: provisionServerDto.providerType,
      serverId: provisionedServer.serverId,
      serverName: provisionedServer.name,
      publicIp: provisionedServer.publicIp,
      privateIp: provisionedServer.privateIp,
      providerMetadata: JSON.stringify(provisionedServer.metadata || {}),
    });

    this.logger.log(`Created provisioning reference ${reference.id} for client ${client.id}`);

    return {
      ...client,
      providerType: provisionServerDto.providerType,
      serverId: provisionedServer.serverId,
      serverName: provisionedServer.name,
      publicIp: provisionedServer.publicIp,
      privateIp: provisionedServer.privateIp,
      serverStatus: provisionedServer.status,
    };
  }

  /**
   * Delete a provisioned server and its associated client.
   * @param clientId - The UUID of the client
   */
  async deleteProvisionedServer(clientId: string): Promise<void> {
    // Find provisioning reference
    const reference = await this.provisioningReferencesRepository.findByClientId(clientId);
    if (!reference) {
      throw new BadRequestException(`No provisioning reference found for client ${clientId}`);
    }

    // Get the provider
    if (!this.provisioningProviderFactory.hasProvider(reference.providerType)) {
      this.logger.warn(
        `Provider type '${reference.providerType}' is not available. Skipping server deletion, but will delete client and reference.`,
      );
    } else {
      // Delete server from provider
      const provider = this.provisioningProviderFactory.getProvider(reference.providerType);
      try {
        await provider.deleteServer(reference.serverId);
        this.logger.log(`Deleted server ${reference.serverId} from ${reference.providerType}`);
      } catch (error) {
        this.logger.error(`Failed to delete server from provider: ${(error as Error).message}`);
        // Continue with client deletion even if server deletion fails
      }
    }

    // Delete client (this will cascade delete the provisioning reference)
    await this.clientsService.remove(clientId);
  }

  /**
   * Get server information for a provisioned client.
   * @param clientId - The UUID of the client
   * @returns Server information
   */
  async getServerInfo(clientId: string): Promise<{
    serverId: string;
    serverName?: string;
    publicIp?: string;
    privateIp?: string;
    serverStatus?: string;
    providerType: string;
  }> {
    const reference = await this.provisioningReferencesRepository.findByClientId(clientId);
    if (!reference) {
      throw new NotFoundException(`No provisioning reference found for client ${clientId}`);
    }

    // Get the provider
    if (!this.provisioningProviderFactory.hasProvider(reference.providerType)) {
      // Return stored information if provider is not available
      return {
        serverId: reference.serverId,
        serverName: reference.serverName,
        publicIp: reference.publicIp || undefined,
        privateIp: reference.privateIp || undefined,
        providerType: reference.providerType,
      };
    }

    // Get fresh information from provider
    const provider = this.provisioningProviderFactory.getProvider(reference.providerType);
    const serverInfo = await provider.getServerInfo(reference.serverId);

    // Update reference with fresh information
    await this.provisioningReferencesRepository.update(reference.id, {
      publicIp: serverInfo.publicIp,
      privateIp: serverInfo.privateIp,
      serverName: serverInfo.name,
    });

    return {
      serverId: serverInfo.serverId,
      serverName: serverInfo.name,
      publicIp: serverInfo.publicIp,
      privateIp: serverInfo.privateIp,
      serverStatus: serverInfo.status,
      providerType: reference.providerType,
    };
  }
}
