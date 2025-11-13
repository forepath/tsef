import { BadRequestException, forwardRef, Inject, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { ClientResponseDto } from '../dto/client-response.dto';
import { CreateClientResponseDto } from '../dto/create-client-response.dto';
import { CreateClientDto } from '../dto/create-client.dto';
import { UpdateClientDto } from '../dto/update-client.dto';
import { AuthenticationType, ClientEntity } from '../entities/client.entity';
import { ClientsRepository } from '../repositories/clients.repository';
import { ClientAgentProxyService } from './client-agent-proxy.service';
import { KeycloakTokenService } from './keycloak-token.service';

/**
 * Service for client business logic operations.
 * Orchestrates repository operations, API key generation, and Keycloak token management.
 */
@Injectable()
export class ClientsService {
  private readonly API_KEY_LENGTH = 32;

  constructor(
    private readonly clientsRepository: ClientsRepository,
    private readonly keycloakTokenService: KeycloakTokenService,
    @Inject(forwardRef(() => ClientAgentProxyService))
    private readonly clientAgentProxyService: ClientAgentProxyService,
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
   * Create a new client with API key (provided or auto-generated if needed).
   * @param createClientDto - Data transfer object for creating a client
   * @returns The created client response DTO with API key (if applicable)
   * @throws BadRequestException if client name already exists
   */
  async create(createClientDto: CreateClientDto): Promise<CreateClientResponseDto> {
    // Check if client with the same name already exists
    const existingClient = await this.clientsRepository.findByName(createClientDto.name);
    if (existingClient) {
      throw new BadRequestException(`Client with name '${createClientDto.name}' already exists`);
    }

    // Validate Keycloak credentials if authentication type is KEYCLOAK
    if (createClientDto.authenticationType === AuthenticationType.KEYCLOAK) {
      if (!createClientDto.keycloakClientId || !createClientDto.keycloakClientSecret) {
        throw new BadRequestException(
          'Keycloak client ID and client secret are required for KEYCLOAK authentication type',
        );
      }
    }

    // Use provided API key or generate one for API_KEY authentication type
    let apiKey: string | undefined;
    if (createClientDto.authenticationType === AuthenticationType.API_KEY) {
      apiKey = createClientDto.apiKey || this.generateRandomApiKey();
    }

    // Create the client entity
    const client = await this.clientsRepository.create({
      name: createClientDto.name,
      description: createClientDto.description,
      endpoint: createClientDto.endpoint,
      authenticationType: createClientDto.authenticationType,
      apiKey,
      keycloakClientId: createClientDto.keycloakClientId,
      keycloakClientSecret: createClientDto.keycloakClientSecret,
      keycloakRealm: createClientDto.keycloakRealm,
      agentWsPort: createClientDto.agentWsPort,
    });

    const response = this.mapToResponseDto(client);
    return {
      ...response,
      apiKey,
    };
  }

  /**
   * Find all clients with pagination.
   * @param limit - Maximum number of clients to return
   * @param offset - Number of clients to skip
   * @returns Array of client response DTOs
   */
  async findAll(limit = 10, offset = 0): Promise<ClientResponseDto[]> {
    const clients = await this.clientsRepository.findAll(limit, offset);
    // Fetch config for all clients in parallel, but don't fail if any request fails
    const clientsWithConfig = await Promise.all(
      clients.map(async (client) => {
        const dto = this.mapToResponseDto(client);
        try {
          dto.config = await this.clientAgentProxyService.getClientConfig(client.id);
        } catch (error) {
          // Config is optional, continue without it
        }
        return dto;
      }),
    );
    return clientsWithConfig;
  }

  /**
   * Find a client by ID.
   * @param id - The UUID of the client
   * @returns The client response DTO
   * @throws NotFoundException if client is not found
   */
  async findOne(id: string): Promise<ClientResponseDto> {
    const client = await this.clientsRepository.findByIdOrThrow(id);
    const dto = this.mapToResponseDto(client);
    // Fetch config from agent-manager, but don't fail if request fails
    try {
      dto.config = await this.clientAgentProxyService.getClientConfig(id);
    } catch (error) {
      // Config is optional, continue without it
    }
    return dto;
  }

  /**
   * Update an existing client.
   * API key can be updated but will never be included in responses.
   * @param id - The UUID of the client to update
   * @param updateClientDto - Data transfer object for updating a client
   * @returns The updated client response DTO
   * @throws NotFoundException if client is not found
   * @throws BadRequestException if new name conflicts with existing client
   */
  async update(id: string, updateClientDto: UpdateClientDto): Promise<ClientResponseDto> {
    // If name is being updated, check for conflicts
    if (updateClientDto.name) {
      const existingClient = await this.clientsRepository.findByName(updateClientDto.name);
      if (existingClient && existingClient.id !== id) {
        throw new BadRequestException(`Client with name '${updateClientDto.name}' already exists`);
      }
    }

    // If authentication type is being changed to KEYCLOAK, validate credentials
    if (updateClientDto.authenticationType === AuthenticationType.KEYCLOAK) {
      const existingClient = await this.clientsRepository.findById(id);
      const isChangingToKeycloak = existingClient?.authenticationType !== AuthenticationType.KEYCLOAK;

      // If changing to KEYCLOAK type, credentials are required
      if (isChangingToKeycloak) {
        if (!updateClientDto.keycloakClientId || !updateClientDto.keycloakClientSecret) {
          throw new BadRequestException(
            'Keycloak client ID and client secret are required when changing authentication type to KEYCLOAK',
          );
        }
      } else {
        // If already KEYCLOAK and credentials are being updated, both must be provided
        if (
          (updateClientDto.keycloakClientId !== undefined || updateClientDto.keycloakClientSecret !== undefined) &&
          (!updateClientDto.keycloakClientId || !updateClientDto.keycloakClientSecret)
        ) {
          throw new BadRequestException(
            'Keycloak client ID and client secret must both be provided when updating credentials',
          );
        }
      }
    }

    // Prepare update data (including API key and Keycloak credentials if provided)
    const updateData: Partial<ClientEntity> = {
      name: updateClientDto.name,
      description: updateClientDto.description,
      endpoint: updateClientDto.endpoint,
      authenticationType: updateClientDto.authenticationType,
      apiKey: updateClientDto.apiKey,
      keycloakClientId: updateClientDto.keycloakClientId,
      keycloakClientSecret: updateClientDto.keycloakClientSecret,
      keycloakRealm: updateClientDto.keycloakRealm,
      agentWsPort: updateClientDto.agentWsPort,
    };

    // If Keycloak credentials are being updated, clear the token cache
    if (updateClientDto.keycloakClientId || updateClientDto.keycloakClientSecret || updateClientDto.keycloakRealm) {
      const existingClient = await this.clientsRepository.findById(id);
      if (existingClient) {
        const authServerUrl = process.env.KEYCLOAK_AUTH_SERVER_URL || '';
        const realm = updateClientDto.keycloakRealm || existingClient.keycloakRealm || process.env.KEYCLOAK_REALM || '';
        const clientId = updateClientDto.keycloakClientId || existingClient.keycloakClientId || '';
        if (authServerUrl && realm && clientId) {
          this.keycloakTokenService.clearCache(authServerUrl, realm, clientId);
        }
      }
    }

    // Remove undefined fields
    Object.keys(updateData).forEach(
      (key) => updateData[key as keyof ClientEntity] === undefined && delete updateData[key as keyof ClientEntity],
    );

    const client = await this.clientsRepository.update(id, updateData);
    const dto = this.mapToResponseDto(client);
    // Fetch config from agent-manager, but don't fail if request fails
    try {
      dto.config = await this.clientAgentProxyService.getClientConfig(id);
    } catch (error) {
      // Config is optional, continue without it
    }
    return dto;
  }

  /**
   * Delete a client by ID.
   * @param id - The UUID of the client to delete
   * @throws NotFoundException if client is not found
   */
  async remove(id: string): Promise<void> {
    const client = await this.clientsRepository.findByIdOrThrow(id);

    // Clear token cache if it's a Keycloak client
    if (client.authenticationType === AuthenticationType.KEYCLOAK && client.keycloakClientId && client.keycloakRealm) {
      const authServerUrl = process.env.KEYCLOAK_AUTH_SERVER_URL || '';
      if (authServerUrl) {
        this.keycloakTokenService.clearCache(authServerUrl, client.keycloakRealm, client.keycloakClientId);
      }
    }

    await this.clientsRepository.delete(id);
  }

  /**
   * Get a JWT access token for a client using Keycloak client credentials flow.
   * @param clientId - The UUID of the client
   * @returns JWT access token
   * @throws BadRequestException if client is not configured for Keycloak authentication
   * @throws NotFoundException if client is not found
   */
  async getAccessToken(clientId: string): Promise<string> {
    const client = await this.clientsRepository.findByIdOrThrow(clientId);

    if (client.authenticationType !== AuthenticationType.KEYCLOAK) {
      throw new BadRequestException('Client is not configured for Keycloak authentication');
    }

    if (!client.keycloakClientId || !client.keycloakClientSecret) {
      throw new BadRequestException('Keycloak client credentials are not configured for this client');
    }

    const authServerUrl = process.env.KEYCLOAK_AUTH_SERVER_URL;
    if (!authServerUrl) {
      throw new BadRequestException('KEYCLOAK_AUTH_SERVER_URL environment variable is not set');
    }

    const realm = client.keycloakRealm || process.env.KEYCLOAK_REALM;
    if (!realm) {
      throw new BadRequestException('Keycloak realm is not configured for this client and KEYCLOAK_REALM is not set');
    }

    return await this.keycloakTokenService.getAccessToken(
      authServerUrl,
      realm,
      client.keycloakClientId,
      client.keycloakClientSecret,
    );
  }

  /**
   * Map client entity to response DTO.
   * Excludes sensitive information like API key.
   * @param client - The client entity to map
   * @returns The client response DTO
   */
  private mapToResponseDto(client: ClientEntity): ClientResponseDto {
    return {
      id: client.id,
      name: client.name,
      description: client.description,
      endpoint: client.endpoint,
      authenticationType: client.authenticationType,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    };
  }
}
