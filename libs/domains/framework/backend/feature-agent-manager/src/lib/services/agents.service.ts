import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as sshpk from 'sshpk';
import { v4 as uuidv4 } from 'uuid';
import { AgentResponseDto } from '../dto/agent-response.dto';
import { CreateAgentResponseDto } from '../dto/create-agent-response.dto';
import { CreateAgentDto } from '../dto/create-agent.dto';
import { UpdateAgentDto } from '../dto/update-agent.dto';
import { AgentEntity } from '../entities/agent.entity';
import { AgentsRepository } from '../repositories/agents.repository';
import { DockerService } from './docker.service';
import { PasswordService } from './password.service';

/**
 * Service for agent business logic operations.
 * Orchestrates repository and password service operations.
 */
@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);
  private readonly PASSWORD_LENGTH = 16;

  constructor(
    private readonly agentsRepository: AgentsRepository,
    private readonly dockerService: DockerService,
    private readonly passwordService: PasswordService,
  ) {}

  /**
   * Generate a secure random password.
   * Uses alphanumeric characters to ensure compatibility.
   * @returns A random password string of PASSWORD_LENGTH characters
   */
  private generateRandomPassword(): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const randomBytesBuffer = randomBytes(this.PASSWORD_LENGTH);
    let password = '';

    for (let i = 0; i < this.PASSWORD_LENGTH; i++) {
      password += charset[randomBytesBuffer[i] % charset.length];
    }

    return password;
  }

  /**
   * Extract the domain from a git repository URL.
   * @param url - The git repository URL (e.g., https://github.com/user/repo.git)
   * @returns The domain (e.g., github.com)
   */
  private extractGitDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      // Fallback: try to extract domain from common git URL patterns
      const match = url.match(/@([^/:]+)|:\/\/([^/:]+)/);
      return match ? match[1] || match[2] : 'github.com';
    }
  }

  /**
   * Escape a string for safe shell usage.
   * @param str - The string to escape
   * @returns The escaped string safe for shell usage
   */
  private escapeForShell(str: string): string {
    return `'${str.replace(/'/g, "'\\''")}'`;
  }

  /**
   * Determine whether the configured git repository uses SSH.
   */
  private isSshRepository(url?: string): boolean {
    if (!url) {
      return false;
    }
    return url.startsWith('git@') || url.startsWith('ssh://');
  }

  /**
   * Resolve SSH host information from repository URL.
   */
  private getSshHostInfo(url: string): { host: string; port?: number } {
    if (url.startsWith('ssh://')) {
      const parsed = new URL(url);
      return { host: parsed.hostname, port: parsed.port ? Number(parsed.port) : undefined };
    }

    const scpLikeMatch = url.match(/^[^@]+@([^:]+):/);
    if (scpLikeMatch?.[1]) {
      return { host: scpLikeMatch[1] };
    }

    return { host: this.extractGitDomain(url) };
  }

  /**
   * Get the SSH key filename based on key type.
   * Maps key algorithm to standard SSH key filenames.
   */
  private getSshKeyFilename(keyType: string): string {
    const typeMap: Record<string, string> = {
      rsa: 'id_rsa',
      ed25519: 'id_ed25519',
      ecdsa: 'id_ecdsa',
      dsa: 'id_dsa',
    };

    const normalizedType = keyType.toLowerCase();
    return typeMap[normalizedType] || 'id_rsa'; // Default to RSA if unknown
  }

  /**
   * Prepare SSH key pair information.
   * Returns the private key contents to place inside the container, the public key to share, and the key filename.
   */
  private prepareSshKeyPair(providedPrivateKey?: string): {
    privateKey: string;
    publicKey: string;
    keyFilename: string;
    generated: boolean;
  } {
    let key: sshpk.PrivateKey;
    const generated = false;

    if (providedPrivateKey?.trim()) {
      try {
        key = sshpk.parsePrivateKey(providedPrivateKey.trim(), 'auto');
      } catch (error) {
        this.logger.debug(`Invalid SSH private key provided: ${(error as Error).message}`);
        throw new BadRequestException(
          'Invalid SSH private key. Ensure it is in PEM or OpenSSH format without a passphrase.',
        );
      }
    } else {
      throw new BadRequestException(
        'Invalid SSH private key. Ensure it is in PEM or OpenSSH format without a passphrase.',
      );
    }

    const privateKey = key.toString('openssh').trimEnd() + '\n';
    const publicKey = key.toPublic().toString('ssh');
    const keyType = key.type || 'rsa';
    const keyFilename = this.getSshKeyFilename(keyType);

    return { privateKey, publicKey, keyFilename, generated };
  }

  /**
   * Helper to write multi-line content into the agent container via base64 encoding.
   */
  private async writeFileToContainer(containerId: string, filePath: string, contents: string): Promise<void> {
    const base64Content = Buffer.from(contents, 'utf-8').toString('base64');
    const escapedBase64 = this.escapeForShell(base64Content);
    await this.dockerService.sendCommandToContainer(containerId, `echo ${escapedBase64} | base64 -d > ${filePath}`);
  }

  /**
   * Configure SSH credentials inside the container and return key metadata for the API response.
   */
  private async configureSshAccess(
    containerId: string,
    repositoryUrl: string,
    providedPrivateKey?: string,
  ): Promise<{ publicKey: string; privateKey?: string }> {
    const keyPair = this.prepareSshKeyPair(providedPrivateKey);
    const { host, port } = this.getSshHostInfo(repositoryUrl);
    const keyPath = `/root/.ssh/${keyPair.keyFilename}`;

    await this.dockerService.sendCommandToContainer(containerId, 'mkdir -p /root/.ssh');
    await this.dockerService.sendCommandToContainer(containerId, 'chmod 700 /root/.ssh');
    await this.writeFileToContainer(containerId, keyPath, keyPair.privateKey);
    await this.dockerService.sendCommandToContainer(containerId, `chmod 600 ${keyPath}`);

    const sshKeyscanCommand = ['ssh-keyscan', port ? `-p ${port}` : '', host, '>> /root/.ssh/known_hosts', '|| true']
      .filter(Boolean)
      .join(' ');
    await this.dockerService.sendCommandToContainer(containerId, sshKeyscanCommand);
    await this.dockerService.sendCommandToContainer(containerId, 'chmod 600 /root/.ssh/known_hosts || true');

    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.generated ? keyPair.privateKey : undefined,
    };
  }

  /**
   * Create .netrc file in the container for git authentication.
   * @param containerId - The ID of the container
   * @throws Error if git credentials are not configured
   */
  private async createNetrcFile(containerId: string): Promise<void> {
    const gitUsername = process.env.GIT_USERNAME;
    const gitToken = process.env.GIT_TOKEN || process.env.GIT_PASSWORD;
    const repositoryUrl = process.env.GIT_REPOSITORY_URL;

    if (!gitUsername || !gitToken || !repositoryUrl) {
      throw new BadRequestException(
        'Git credentials not configured. Please set GIT_USERNAME, GIT_TOKEN (or GIT_PASSWORD), and GIT_REPOSITORY_URL environment variables.',
      );
    }

    const gitDomain = this.extractGitDomain(repositoryUrl);

    const escapedUsername = this.escapeForShell(gitUsername);
    const escapedToken = this.escapeForShell(gitToken);
    const escapedDomain = this.escapeForShell(gitDomain);

    // Create .netrc file line by line using echo commands
    // This approach works better with the command splitting in sendCommandToContainer
    // Note: Values are already escaped and wrapped in single quotes by escapeForShell
    // The shell will naturally add a space between the double-quoted string and the escaped value
    const commands = [
      `echo machine ${escapedDomain} > /root/.netrc`,
      `echo "  login" ${escapedUsername} >> /root/.netrc`,
      `echo "  password" ${escapedToken} >> /root/.netrc`,
      `chmod 600 /root/.netrc`,
    ];

    // Execute commands sequentially
    for (const cmd of commands) {
      await this.dockerService.sendCommandToContainer(containerId, cmd);
    }
  }

  /**
   * Create a new agent with auto-generated password.
   * @param createAgentDto - Data transfer object for creating an agent
   * @returns The created agent response DTO with generated password
   * @throws BadRequestException if agent name already exists
   */
  async create(createAgentDto: CreateAgentDto): Promise<CreateAgentResponseDto> {
    // Check if agent with the same name already exists
    const existingAgent = await this.agentsRepository.findByName(createAgentDto.name);
    if (existingAgent) {
      throw new BadRequestException(`Agent with name '${createAgentDto.name}' already exists`);
    }

    // Generate a random password
    const generatedPassword = this.generateRandomPassword();

    // Hash the password
    const hashedPassword = await this.passwordService.hashPassword(generatedPassword);

    // Define a folder name for the agent
    const agentVolumePath = `/opt/agents/${uuidv4()}`;

    const repositoryUrl = process.env.GIT_REPOSITORY_URL;
    if (!repositoryUrl) {
      throw new BadRequestException('Git repository URL not configured. Please set GIT_REPOSITORY_URL.');
    }

    const sshRepository = this.isSshRepository(repositoryUrl);

    // Create a docker container
    const containerId = await this.dockerService.createContainer({
      name: createAgentDto.name,
      env: {
        AGENT_NAME: createAgentDto.name,
        CURSOR_API_KEY: process.env.CURSOR_API_KEY,
        GIT_REPOSITORY_URL: repositoryUrl,
        GIT_USERNAME: process.env.GIT_USERNAME,
        GIT_TOKEN: process.env.GIT_TOKEN,
        GIT_PASSWORD: process.env.GIT_PASSWORD,
        GIT_PRIVATE_KEY: process.env.GIT_PRIVATE_KEY,
      },
      volumes: [
        {
          hostPath: agentVolumePath,
          containerPath: '/app',
          readOnly: false,
        },
      ],
    });

    try {
      if (sshRepository) {
        await this.configureSshAccess(containerId, repositoryUrl, process.env.GIT_PRIVATE_KEY);
      } else {
        // Create .netrc file for git authentication
        await this.createNetrcFile(containerId);
      }

      const escapedUrl = this.escapeForShell(repositoryUrl);

      // Clone the repository to the agent volume
      await this.dockerService.sendCommandToContainer(containerId, `git clone ${escapedUrl} /app`);

      // Create the agent entity
      const agent = await this.agentsRepository.create({
        name: createAgentDto.name,
        description: createAgentDto.description,
        hashedPassword,
        containerId: containerId,
        volumePath: agentVolumePath,
      });

      return {
        ...this.mapToResponseDto(agent),
        password: generatedPassword,
      };
    } catch (error) {
      // Clean up the container if any step after creation fails
      try {
        await this.dockerService.deleteContainer(containerId);
      } catch (cleanupError) {
        // Log cleanup error but don't mask the original error
        // The original error is more important for debugging
        const err = cleanupError as { message?: string; stack?: string };
        this.logger.error(
          `Failed to clean up container ${containerId} after agent creation failure: ${err.message}`,
          err.stack,
        );
      }
      // Re-throw the original error
      throw error;
    }
  }

  /**
   * Find all agents with pagination.
   * @param limit - Maximum number of agents to return
   * @param offset - Number of agents to skip
   * @returns Array of agent response DTOs
   */
  async findAll(limit = 10, offset = 0): Promise<AgentResponseDto[]> {
    const agents = await this.agentsRepository.findAll(limit, offset);
    return agents.map((agent) => this.mapToResponseDto(agent));
  }

  /**
   * Find an agent by ID.
   * @param id - The UUID of the agent
   * @returns The agent response DTO
   * @throws NotFoundException if agent is not found
   */
  async findOne(id: string): Promise<AgentResponseDto> {
    const agent = await this.agentsRepository.findByIdOrThrow(id);
    return this.mapToResponseDto(agent);
  }

  /**
   * Update an existing agent.
   * Password cannot be updated after creation.
   * @param id - The UUID of the agent to update
   * @param updateAgentDto - Data transfer object for updating an agent
   * @returns The updated agent response DTO
   * @throws NotFoundException if agent is not found
   * @throws BadRequestException if new name conflicts with existing agent
   */
  async update(id: string, updateAgentDto: UpdateAgentDto): Promise<AgentResponseDto> {
    // If name is being updated, check for conflicts
    if (updateAgentDto.name) {
      const existingAgent = await this.agentsRepository.findByName(updateAgentDto.name);
      if (existingAgent && existingAgent.id !== id) {
        throw new BadRequestException(`Agent with name '${updateAgentDto.name}' already exists`);
      }
    }

    // Prepare update data (password cannot be updated)
    const updateData: Partial<AgentEntity> = {
      name: updateAgentDto.name,
      description: updateAgentDto.description,
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(
      (key) => updateData[key as keyof AgentEntity] === undefined && delete updateData[key as keyof AgentEntity],
    );

    const agent = await this.agentsRepository.update(id, updateData);
    return this.mapToResponseDto(agent);
  }

  /**
   * Delete an agent by ID.
   * @param id - The UUID of the agent to delete
   * @throws NotFoundException if agent is not found
   */
  async remove(id: string): Promise<void> {
    const agent = await this.agentsRepository.findByIdOrThrow(id);

    if (agent.containerId) {
      await this.dockerService.deleteContainer(agent.containerId);
    }

    await this.agentsRepository.delete(id);
  }

  /**
   * Verify agent credentials.
   * @param id - The UUID of the agent
   * @param password - The plain text password to verify
   * @returns True if credentials are valid, false otherwise
   */
  async verifyCredentials(id: string, password: string): Promise<boolean> {
    const agent = await this.agentsRepository.findById(id);
    if (!agent) {
      return false;
    }
    return await this.passwordService.verifyPassword(password, agent.hashedPassword);
  }

  /**
   * Map agent entity to response DTO.
   * Excludes sensitive information like password hash.
   * @param agent - The agent entity to map
   * @returns The agent response DTO
   */
  private mapToResponseDto(agent: AgentEntity): AgentResponseDto {
    return {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    };
  }
}
