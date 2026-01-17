import {
  AgentResponseDto,
  CreateAgentDto,
  CreateAgentResponseDto,
  CreateEnvironmentVariableDto,
  CreateFileDto,
  EnvironmentVariableResponseDto,
  FileContentDto,
  FileNodeDto,
  MoveFileDto,
  UpdateAgentDto,
  UpdateEnvironmentVariableDto,
  WriteFileDto,
} from '@forepath/framework/backend/feature-agent-manager';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Resource } from 'nest-keycloak-connect';
import { ClientResponseDto } from './dto/client-response.dto';
import { CreateClientResponseDto } from './dto/create-client-response.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { ProvisionServerDto } from './dto/provision-server.dto';
import { ProvisionedServerResponseDto } from './dto/provisioned-server-response.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ProvisioningProviderFactory } from './providers/provisioning-provider.factory';
import { ClientAgentEnvironmentVariablesProxyService } from './services/client-agent-environment-variables-proxy.service';
import { ClientAgentFileSystemProxyService } from './services/client-agent-file-system-proxy.service';
import { ClientAgentProxyService } from './services/client-agent-proxy.service';
import { ClientsService } from './services/clients.service';
import { ProvisioningService } from './services/provisioning.service';

/**
 * Controller for client management endpoints.
 * Provides CRUD operations for clients and proxied agent operations.
 */
@Resource('clients')
@Controller('clients')
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly clientAgentProxyService: ClientAgentProxyService,
    private readonly clientAgentFileSystemProxyService: ClientAgentFileSystemProxyService,
    private readonly clientAgentEnvironmentVariablesProxyService: ClientAgentEnvironmentVariablesProxyService,
    private readonly provisioningService: ProvisioningService,
    private readonly provisioningProviderFactory: ProvisioningProviderFactory,
  ) {}

  /**
   * Get all clients with pagination.
   * @param limit - Maximum number of clients to return (default: 10)
   * @param offset - Number of clients to skip (default: 0)
   * @returns Array of client response DTOs
   */
  @Get()
  async getClients(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ): Promise<ClientResponseDto[]> {
    return await this.clientsService.findAll(limit ?? 10, offset ?? 0);
  }

  /**
   * Create a new client.
   * An API key will be generated (if API_KEY authentication type) and returned in the response.
   * @param createClientDto - Data transfer object for creating a client
   * @returns The created client response DTO with generated API key (if applicable)
   */
  @Post()
  async createClient(@Body() createClientDto: CreateClientDto): Promise<CreateClientResponseDto> {
    return await this.clientsService.create(createClientDto);
  }

  /**
   * Get a single agent for a specific client by agent ID.
   * @param id - The UUID of the client
   * @param agentId - The UUID of the agent
   * @returns The agent response DTO
   */
  @Get(':id/agents/:agentId')
  async getClientAgent(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('agentId', new ParseUUIDPipe({ version: '4' })) agentId: string,
  ): Promise<AgentResponseDto> {
    return await this.clientAgentProxyService.getClientAgent(id, agentId);
  }

  /**
   * Get all agents for a specific client with pagination.
   * @param id - The UUID of the client
   * @param limit - Maximum number of agents to return (default: 10)
   * @param offset - Number of agents to skip (default: 0)
   * @returns Array of agent response DTOs
   */
  @Get(':id/agents')
  async getClientAgents(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ): Promise<AgentResponseDto[]> {
    return await this.clientAgentProxyService.getClientAgents(id, limit ?? 10, offset ?? 0);
  }

  /**
   * Update an existing agent for a specific client.
   * @param id - The UUID of the client
   * @param agentId - The UUID of the agent to update
   * @param updateAgentDto - Data transfer object for updating an agent
   * @returns The updated agent response DTO
   */
  @Post(':id/agents/:agentId')
  async updateClientAgent(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('agentId', new ParseUUIDPipe({ version: '4' })) agentId: string,
    @Body() updateAgentDto: UpdateAgentDto,
  ): Promise<AgentResponseDto> {
    return await this.clientAgentProxyService.updateClientAgent(id, agentId, updateAgentDto);
  }

  /**
   * Create a new agent for a specific client.
   * A random password will be generated and returned in the response.
   * @param id - The UUID of the client
   * @param createAgentDto - Data transfer object for creating an agent
   * @returns The created agent response DTO with generated password
   */
  @Post(':id/agents')
  async createClientAgent(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() createAgentDto: CreateAgentDto,
  ): Promise<CreateAgentResponseDto> {
    return await this.clientAgentProxyService.createClientAgent(id, createAgentDto);
  }

  /**
   * Delete an agent for a specific client by agent ID.
   * @param id - The UUID of the client
   * @param agentId - The UUID of the agent to delete
   */
  @Delete(':id/agents/:agentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteClientAgent(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('agentId', new ParseUUIDPipe({ version: '4' })) agentId: string,
  ): Promise<void> {
    await this.clientAgentProxyService.deleteClientAgent(id, agentId);
  }

  /**
   * Get a single client by ID.
   * @param id - The UUID of the client
   * @returns The client response DTO
   */
  @Get(':id')
  async getClient(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<ClientResponseDto> {
    return await this.clientsService.findOne(id);
  }

  /**
   * Update an existing client.
   * @param id - The UUID of the client to update
   * @param updateClientDto - Data transfer object for updating a client
   * @returns The updated client response DTO
   */
  @Post(':id')
  async updateClient(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateClientDto: UpdateClientDto,
  ): Promise<ClientResponseDto> {
    return await this.clientsService.update(id, updateClientDto);
  }

  /**
   * Delete a client by ID.
   * If the client has a provisioning reference, the provisioned server will also be deleted.
   * @param id - The UUID of the client to delete
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteClient(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<void> {
    // Check if client has provisioning - if so, delete the server from the provider
    try {
      await this.provisioningService.deleteProvisionedServer(id);
      // deleteProvisionedServer already deletes the client, so we're done
      return;
    } catch (error) {
      // If no provisioning reference exists, continue with regular client deletion
      // BadRequestException with "No provisioning reference" means no provisioning - that's fine
      if (
        error instanceof BadRequestException &&
        (error.message.includes('No provisioning reference') || error.message.includes('provisioning reference'))
      ) {
        await this.clientsService.remove(id);
        return;
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Read file content from agent container via client proxy.
   * @param id - The UUID of the client
   * @param agentId - The UUID of the agent
   * @param path - The file path (wildcard parameter for nested paths)
   * @returns File content (base64-encoded) and encoding type
   */
  @Get(':id/agents/:agentId/files/*path')
  async readFile(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('agentId', new ParseUUIDPipe({ version: '4' })) agentId: string,
    @Param('path') path: string | string[] | Record<string, unknown> | undefined,
  ): Promise<FileContentDto> {
    // Normalize path: wildcard parameters can be string, array, object, or undefined
    let normalizedPath: string;
    if (typeof path === 'string') {
      normalizedPath = path;
    } else if (Array.isArray(path)) {
      normalizedPath = path.join('/');
    } else if (path && typeof path === 'object') {
      // If it's an object, try to extract a meaningful path or use default
      normalizedPath = '.';
    } else {
      normalizedPath = '.';
    }
    return await this.clientAgentFileSystemProxyService.readFile(id, agentId, normalizedPath);
  }

  /**
   * Write file content to agent container via client proxy.
   * @param id - The UUID of the client
   * @param agentId - The UUID of the agent
   * @param path - The file path (wildcard parameter for nested paths)
   * @param writeFileDto - The file content to write (base64-encoded)
   */
  @Put(':id/agents/:agentId/files/*path')
  @HttpCode(HttpStatus.NO_CONTENT)
  async writeFile(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('agentId', new ParseUUIDPipe({ version: '4' })) agentId: string,
    @Param('path') path: string | string[] | Record<string, unknown> | undefined,
    @Body() writeFileDto: WriteFileDto,
  ): Promise<void> {
    // Normalize path: wildcard parameters can be string, array, object, or undefined
    let normalizedPath: string | undefined;
    if (typeof path === 'string') {
      normalizedPath = path;
    } else if (Array.isArray(path)) {
      normalizedPath = path.join('/');
    } else if (path && typeof path === 'object') {
      // If it's an object, we can't determine the path - throw error
      throw new BadRequestException('File path must be a string or array, got object');
    }
    if (!normalizedPath) {
      throw new BadRequestException('File path is required');
    }
    await this.clientAgentFileSystemProxyService.writeFile(id, agentId, normalizedPath, writeFileDto);
  }

  /**
   * List directory contents in agent container via client proxy.
   * @param id - The UUID of the client
   * @param agentId - The UUID of the agent
   * @param path - Optional directory path (defaults to '.')
   * @returns Array of file nodes
   */
  @Get(':id/agents/:agentId/files')
  async listDirectory(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('agentId', new ParseUUIDPipe({ version: '4' })) agentId: string,
    @Query('path') path?: string,
  ): Promise<FileNodeDto[]> {
    return await this.clientAgentFileSystemProxyService.listDirectory(id, agentId, path || '.');
  }

  /**
   * Create a file or directory in agent container via client proxy.
   * @param id - The UUID of the client
   * @param agentId - The UUID of the agent
   * @param path - The file path (wildcard parameter for nested paths)
   * @param createFileDto - The file/directory creation data
   */
  @Post(':id/agents/:agentId/files/*path')
  @HttpCode(HttpStatus.CREATED)
  async createFileOrDirectory(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('agentId', new ParseUUIDPipe({ version: '4' })) agentId: string,
    @Param('path') path: string | string[] | Record<string, unknown> | undefined,
    @Body() createFileDto: CreateFileDto,
  ): Promise<void> {
    // Normalize path: wildcard parameters can be string, array, object, or undefined
    let normalizedPath: string | undefined;
    if (typeof path === 'string') {
      normalizedPath = path;
    } else if (Array.isArray(path)) {
      normalizedPath = path.join('/');
    } else if (path && typeof path === 'object') {
      // If it's an object, we can't determine the path - throw error
      throw new BadRequestException('File path must be a string or array, got object');
    }
    if (!normalizedPath) {
      throw new BadRequestException('File path is required');
    }
    await this.clientAgentFileSystemProxyService.createFileOrDirectory(id, agentId, normalizedPath, createFileDto);
  }

  /**
   * Delete a file or directory from agent container via client proxy.
   * @param id - The UUID of the client
   * @param agentId - The UUID of the agent
   * @param path - The file path (wildcard parameter for nested paths)
   */
  @Delete(':id/agents/:agentId/files/*path')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFileOrDirectory(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('agentId', new ParseUUIDPipe({ version: '4' })) agentId: string,
    @Param('path') path: string | string[] | Record<string, unknown> | undefined,
  ): Promise<void> {
    // Normalize path: wildcard parameters can be string, array, object, or undefined
    let normalizedPath: string | undefined;
    if (typeof path === 'string') {
      normalizedPath = path;
    } else if (Array.isArray(path)) {
      normalizedPath = path.join('/');
    } else if (path && typeof path === 'object') {
      // If it's an object, we can't determine the path - throw error
      throw new BadRequestException('File path must be a string or array, got object');
    }
    if (!normalizedPath) {
      throw new BadRequestException('File path is required');
    }
    await this.clientAgentFileSystemProxyService.deleteFileOrDirectory(id, agentId, normalizedPath);
  }

  /**
   * Move a file or directory in agent container via client proxy.
   * @param id - The UUID of the client
   * @param agentId - The UUID of the agent
   * @param path - The source file path (wildcard parameter for nested paths)
   * @param moveFileDto - The move operation data (destination path)
   */
  @Patch(':id/agents/:agentId/files/*path')
  @HttpCode(HttpStatus.NO_CONTENT)
  async moveFileOrDirectory(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('agentId', new ParseUUIDPipe({ version: '4' })) agentId: string,
    @Param('path') path: string | string[] | Record<string, unknown> | undefined,
    @Body() moveFileDto: MoveFileDto,
  ): Promise<void> {
    // Normalize path: wildcard parameters can be string, array, object, or undefined
    let normalizedPath: string | undefined;
    if (typeof path === 'string') {
      normalizedPath = path;
    } else if (Array.isArray(path)) {
      normalizedPath = path.join('/');
    } else if (path && typeof path === 'object') {
      // If it's an object, we can't determine the path - throw error
      throw new BadRequestException('File path must be a string or array, got object');
    }
    if (!normalizedPath) {
      throw new BadRequestException('File path is required');
    }
    if (!moveFileDto.destination) {
      throw new BadRequestException('Destination path is required');
    }
    await this.clientAgentFileSystemProxyService.moveFileOrDirectory(id, agentId, normalizedPath, moveFileDto);
  }

  /**
   * Get all available provisioning providers.
   * @returns Array of provider information
   */
  @Get('provisioning/providers')
  async getProvisioningProviders(): Promise<Array<{ type: string; displayName: string }>> {
    return this.provisioningProviderFactory.getAllProviders().map((provider) => ({
      type: provider.getType(),
      displayName: provider.getDisplayName(),
    }));
  }

  /**
   * Get available server types for a provisioning provider.
   * @param providerType - The provider type (e.g., 'hetzner')
   * @returns Array of server types with specifications and pricing
   */
  @Get('provisioning/providers/:providerType/server-types')
  async getServerTypes(@Param('providerType') providerType: string) {
    if (!this.provisioningProviderFactory.hasProvider(providerType)) {
      throw new BadRequestException(
        `Provider type '${providerType}' is not available. Available types: ${this.provisioningProviderFactory.getRegisteredTypes().join(', ')}`,
      );
    }
    const provider = this.provisioningProviderFactory.getProvider(providerType);
    return await provider.getServerTypes();
  }

  /**
   * Provision a new server and create a client.
   * @param provisionServerDto - Provisioning options
   * @returns Provisioned server response with client information
   */
  @Post('provisioning/provision')
  async provisionServer(@Body() provisionServerDto: ProvisionServerDto): Promise<ProvisionedServerResponseDto> {
    return await this.provisioningService.provisionServer(provisionServerDto);
  }

  /**
   * Get server information for a provisioned client.
   * @param id - The UUID of the client
   * @returns Server information
   */
  @Get(':id/provisioning/info')
  async getServerInfo(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return await this.provisioningService.getServerInfo(id);
  }

  /**
   * Delete a provisioned server and its associated client.
   * @param id - The UUID of the client
   */
  @Delete(':id/provisioning')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProvisionedServer(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<void> {
    await this.provisioningService.deleteProvisionedServer(id);
  }

  /**
   * Get all environment variables for an agent with pagination (proxied).
   * @param id - The UUID of the client
   * @param agentId - The UUID of the agent
   * @param limit - Maximum number of environment variables to return (default: 50)
   * @param offset - Number of environment variables to skip (default: 0)
   * @returns Array of environment variable response DTOs
   */
  @Get(':id/agents/:agentId/environment')
  async getClientAgentEnvironmentVariables(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('agentId', new ParseUUIDPipe({ version: '4' })) agentId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ): Promise<EnvironmentVariableResponseDto[]> {
    return await this.clientAgentEnvironmentVariablesProxyService.getEnvironmentVariables(
      id,
      agentId,
      limit ?? 50,
      offset ?? 0,
    );
  }

  /**
   * Get count of environment variables for an agent (proxied).
   * @param id - The UUID of the client
   * @param agentId - The UUID of the agent
   * @returns Count of environment variables
   */
  @Get(':id/agents/:agentId/environment/count')
  async countClientAgentEnvironmentVariables(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('agentId', new ParseUUIDPipe({ version: '4' })) agentId: string,
  ): Promise<{ count: number }> {
    return await this.clientAgentEnvironmentVariablesProxyService.countEnvironmentVariables(id, agentId);
  }

  /**
   * Create a new environment variable for an agent (proxied).
   * @param id - The UUID of the client
   * @param agentId - The UUID of the agent
   * @param createDto - Data transfer object for creating an environment variable
   * @returns The created environment variable response DTO
   */
  @Post(':id/agents/:agentId/environment')
  @HttpCode(HttpStatus.CREATED)
  async createClientAgentEnvironmentVariable(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('agentId', new ParseUUIDPipe({ version: '4' })) agentId: string,
    @Body() createDto: CreateEnvironmentVariableDto,
  ): Promise<EnvironmentVariableResponseDto> {
    return await this.clientAgentEnvironmentVariablesProxyService.createEnvironmentVariable(id, agentId, createDto);
  }

  /**
   * Update an existing environment variable (proxied).
   * @param id - The UUID of the client
   * @param agentId - The UUID of the agent
   * @param envVarId - The UUID of the environment variable to update
   * @param updateDto - Data transfer object for updating an environment variable
   * @returns The updated environment variable response DTO
   */
  @Put(':id/agents/:agentId/environment/:envVarId')
  async updateClientAgentEnvironmentVariable(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('agentId', new ParseUUIDPipe({ version: '4' })) agentId: string,
    @Param('envVarId', new ParseUUIDPipe({ version: '4' })) envVarId: string,
    @Body() updateDto: UpdateEnvironmentVariableDto,
  ): Promise<EnvironmentVariableResponseDto> {
    return await this.clientAgentEnvironmentVariablesProxyService.updateEnvironmentVariable(
      id,
      agentId,
      envVarId,
      updateDto,
    );
  }

  /**
   * Delete an environment variable by ID (proxied).
   * @param id - The UUID of the client
   * @param agentId - The UUID of the agent
   * @param envVarId - The UUID of the environment variable to delete
   */
  @Delete(':id/agents/:agentId/environment/:envVarId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteClientAgentEnvironmentVariable(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('agentId', new ParseUUIDPipe({ version: '4' })) agentId: string,
    @Param('envVarId', new ParseUUIDPipe({ version: '4' })) envVarId: string,
  ): Promise<void> {
    await this.clientAgentEnvironmentVariablesProxyService.deleteEnvironmentVariable(id, agentId, envVarId);
  }

  /**
   * Delete all environment variables for an agent (proxied).
   * @param id - The UUID of the client
   * @param agentId - The UUID of the agent
   * @returns Number of environment variables deleted
   */
  @Delete(':id/agents/:agentId/environment')
  @HttpCode(HttpStatus.OK)
  async deleteAllClientAgentEnvironmentVariables(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('agentId', new ParseUUIDPipe({ version: '4' })) agentId: string,
  ): Promise<{ deletedCount: number }> {
    return await this.clientAgentEnvironmentVariablesProxyService.deleteAllEnvironmentVariables(id, agentId);
  }
}
