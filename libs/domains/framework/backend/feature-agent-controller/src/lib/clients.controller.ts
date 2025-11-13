import {
  AgentResponseDto,
  CreateAgentDto,
  CreateAgentResponseDto,
  CreateFileDto,
  FileContentDto,
  FileNodeDto,
  UpdateAgentDto,
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
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Resource } from 'nest-keycloak-connect';
import { ClientResponseDto } from './dto/client-response.dto';
import { CreateClientResponseDto } from './dto/create-client-response.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientAgentFileSystemProxyService } from './services/client-agent-file-system-proxy.service';
import { ClientAgentProxyService } from './services/client-agent-proxy.service';
import { ClientsService } from './services/clients.service';

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
   * @param id - The UUID of the client to delete
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteClient(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<void> {
    await this.clientsService.remove(id);
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
}
