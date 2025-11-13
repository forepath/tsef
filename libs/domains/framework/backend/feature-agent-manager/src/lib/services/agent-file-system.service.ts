import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FileContentDto } from '../dto/file-content.dto';
import { FileNodeDto } from '../dto/file-node.dto';
import { AgentsRepository } from '../repositories/agents.repository';
import { AgentsService } from './agents.service';
import { DockerService } from './docker.service';

/**
 * Service for agent file system operations.
 * Provides read, write, list, create, and delete operations on agent container files.
 */
@Injectable()
export class AgentFileSystemService {
  private readonly logger = new Logger(AgentFileSystemService.name);
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly BASE_PATH = '/app';

  constructor(
    private readonly agentsService: AgentsService,
    private readonly agentsRepository: AgentsRepository,
    private readonly dockerService: DockerService,
  ) {}

  /**
   * Sanitize and validate a file path to prevent directory traversal attacks.
   * @param path - The file path to sanitize
   * @returns The sanitized path
   * @throws BadRequestException if path contains invalid characters or traversal attempts
   */
  private sanitizePath(path: string): string {
    // Validate that path is a string
    if (typeof path !== 'string') {
      throw new BadRequestException(`Path must be a string, got ${typeof path}`);
    }

    if (!path || path.trim().length === 0) {
      throw new BadRequestException('Path cannot be empty');
    }

    // Remove leading slashes and normalize
    const normalized = path.replace(/^\/+/, '').trim();

    // Check for directory traversal attempts
    if (normalized.includes('..') || normalized.includes('../')) {
      throw new BadRequestException('Path traversal is not allowed');
    }

    // Check for null bytes
    if (normalized.includes('\0')) {
      throw new BadRequestException('Path cannot contain null bytes');
    }

    return normalized;
  }

  /**
   * Build the full container path from a relative path.
   * @param relativePath - The relative path from /app
   * @returns The full container path
   */
  private buildContainerPath(relativePath: string): string {
    const sanitized = this.sanitizePath(relativePath);
    return `${this.BASE_PATH}/${sanitized}`;
  }

  /**
   * Read file content from agent container.
   * Returns content as base64-encoded string to support both text and binary files.
   * Text files are read as plain text and then properly encoded to base64.
   * Binary files are read directly as base64.
   * @param agentId - The UUID of the agent
   * @param filePath - The relative path to the file (from /app)
   * @returns File content (base64-encoded) and encoding type
   * @throws NotFoundException if agent or file is not found
   * @throws BadRequestException if path is invalid
   */
  async readFile(agentId: string, filePath: string): Promise<FileContentDto> {
    await this.agentsService.findOne(agentId);
    const agentEntity = await this.agentsRepository.findByIdOrThrow(agentId);

    if (!agentEntity.containerId) {
      throw new NotFoundException(`Agent ${agentId} has no associated container`);
    }

    const containerPath = this.buildContainerPath(filePath);
    const escapedPath = this.escapeForShell(containerPath);

    try {
      // First, check if file is likely binary based on extension
      // If so, read directly as base64 without trying text first
      if (this.isLikelyBinaryFile(filePath)) {
        let base64Content = await this.dockerService.sendCommandToContainer(
          agentEntity.containerId,
          `sh -c "base64 ${escapedPath} | tr -d '\\n'"`,
        );

        // Clean up base64 content - remove any non-base64 characters that might come from Docker output
        // But be more careful - only remove whitespace and control characters, keep valid base64 chars
        base64Content = base64Content.replace(/[\s\r\n\t]/g, '').trim();

        // Validate base64 format (should only contain A-Z, a-z, 0-9, +, /, =)
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Content)) {
          this.logger.warn(`Invalid base64 content detected for ${filePath}, attempting to clean`);
          // Remove invalid characters but keep the structure
          base64Content = base64Content.replace(/[^A-Za-z0-9+/=]/g, '');
        }

        // Check file size (base64 is ~33% larger than original)
        const approximateOriginalSize = (base64Content.length * 3) / 4;
        if (approximateOriginalSize > this.MAX_FILE_SIZE) {
          throw new BadRequestException(`File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE} bytes`);
        }

        return {
          content: base64Content,
          encoding: 'base64',
        };
      }

      // For files that might be text, try reading as plain text first
      // This approach is more reliable than guessing from file extension
      try {
        // Use the dedicated readFileFromContainer method which uses demuxStream
        // This properly handles Docker's multiplexed format and eliminates null byte artifacts
        const textContent = await this.dockerService.readFileFromContainer(agentEntity.containerId, containerPath);

        // Check if content has a high percentage of non-printable control characters
        // This would indicate it's actually binary, not just parsing artifacts
        const sampleSize = Math.min(512, textContent.length);
        const sample = textContent.substring(0, sampleSize);
        let controlCharCount = 0;
        for (let i = 0; i < sample.length; i++) {
          const charCode = sample.charCodeAt(i);
          // Count control characters (excluding common whitespace: tab, LF, CR)
          if (
            (charCode >= 0 && charCode <= 8) || // Null, bell, backspace, etc.
            charCode === 11 || // Vertical tab
            charCode === 12 || // Form feed
            (charCode >= 14 && charCode <= 31) || // Other control chars (excluding CR/LF)
            (charCode >= 127 && charCode <= 159) // DEL and C1 control chars
          ) {
            controlCharCount++;
          }
        }

        // If more than 10% of characters are control characters, it's likely binary
        // This is a higher threshold to avoid false positives
        const controlCharThreshold = 0.1;
        if (controlCharCount / sampleSize > controlCharThreshold) {
          this.logger.debug(
            `File ${filePath} has high percentage of control characters (${((controlCharCount / sampleSize) * 100).toFixed(1)}%), treating as binary`,
          );
          // Read as base64
          let base64Content = await this.dockerService.sendCommandToContainer(
            agentEntity.containerId,
            `sh -c "base64 ${escapedPath} | tr -d '\\n'"`,
          );

          // Clean up base64 content
          base64Content = base64Content.replace(/[\s\r\n\t]/g, '').trim();

          // Validate base64 format
          if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Content)) {
            this.logger.warn(`Invalid base64 content detected for ${filePath}, attempting to clean`);
            base64Content = base64Content.replace(/[^A-Za-z0-9+/=]/g, '');
          }

          // Check file size
          const approximateOriginalSize = (base64Content.length * 3) / 4;
          if (approximateOriginalSize > this.MAX_FILE_SIZE) {
            throw new BadRequestException(`File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE} bytes`);
          }

          return {
            content: base64Content,
            encoding: 'base64',
          };
        }

        // It's text - check file size
        const textSize = Buffer.byteLength(textContent, 'utf-8');
        if (textSize > this.MAX_FILE_SIZE) {
          throw new BadRequestException(`File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE} bytes`);
        }

        // Encode text to base64 properly using Node.js Buffer
        const base64Content = Buffer.from(textContent, 'utf-8').toString('base64');

        this.logger.debug(`File ${filePath} read as text (${textSize} bytes), encoded to base64`);
        return {
          content: base64Content,
          encoding: 'utf-8',
        };
      } catch (textReadError: unknown) {
        // If text read fails, it might be because:
        // 1. The file is actually binary and cat fails
        // 2. There's a Docker/permission issue
        // 3. The file doesn't exist (but we should have caught that earlier)
        // 4. A BadRequestException was thrown (e.g., file size exceeded) - rethrow it
        if (textReadError instanceof BadRequestException) {
          throw textReadError;
        }

        const errorMessage = (textReadError as Error).message || String(textReadError);
        this.logger.debug(`Text read failed for ${filePath}, falling back to base64: ${errorMessage}`);

        // Only fall back to base64 if it's not a "file not found" error
        // (which should have been caught earlier, but just in case)
        if (errorMessage.includes('No such file') || errorMessage.includes('not found')) {
          throw new NotFoundException(`File not found: ${filePath}`);
        }

        let base64Content = await this.dockerService.sendCommandToContainer(
          agentEntity.containerId,
          `sh -c "base64 ${escapedPath} | tr -d '\\n'"`,
        );

        // Clean up base64 content
        base64Content = base64Content.replace(/[\s\r\n\t]/g, '').trim();

        // Validate base64 format
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Content)) {
          this.logger.warn(`Invalid base64 content detected for ${filePath}, attempting to clean`);
          base64Content = base64Content.replace(/[^A-Za-z0-9+/=]/g, '');
        }

        // Check file size
        const approximateOriginalSize = (base64Content.length * 3) / 4;
        if (approximateOriginalSize > this.MAX_FILE_SIZE) {
          throw new BadRequestException(`File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE} bytes`);
        }

        this.logger.debug(`File ${filePath} read as base64 (fallback from text read failure)`);
        return {
          content: base64Content,
          encoding: 'base64',
        };
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (err.message?.includes('No such file') || err.message?.includes('not found')) {
        throw new NotFoundException(`File not found: ${filePath}`);
      }
      this.logger.error(`Error reading file ${filePath} for agent ${agentId}: ${err.message}`);
      throw error;
    }
  }

  /**
   * Determine if a file is likely binary based on its extension.
   * @param filePath - The file path
   * @returns True if file is likely binary
   */
  private isLikelyBinaryFile(filePath: string): boolean {
    const binaryExtensions = [
      '.png',
      '.jpg',
      '.jpeg',
      '.gif',
      '.bmp',
      '.svg',
      '.ico',
      '.webp',
      '.pdf',
      '.zip',
      '.tar',
      '.gz',
      '.exe',
      '.dll',
      '.so',
      '.dylib',
      '.bin',
      '.woff',
      '.woff2',
      '.ttf',
      '.eot',
      '.otf',
    ];
    const lowerPath = filePath.toLowerCase();
    return binaryExtensions.some((ext) => lowerPath.endsWith(ext));
  }

  /**
   * Sanitize string by removing invalid filesystem characters.
   * Keeps only valid characters: letters, numbers, dots, dashes, underscores, slashes, and spaces.
   * Used for file names, directory names, paths, and other filesystem-related strings.
   * @param str - The string to sanitize
   * @returns Sanitized string
   */
  private sanitizeFilesystemString(str: string): string {
    if (!str || typeof str !== 'string') {
      return '';
    }
    // Keep only alphanumeric, dots, dashes, underscores, slashes, and spaces
    // Remove everything else (control characters, shell special chars, etc.)
    return str.replace(/[^a-zA-Z0-9.\-_/ ]/g, '').trim();
  }

  /**
   * Write file content to agent container.
   * Accepts base64-encoded content to support both text and binary files.
   * @param agentId - The UUID of the agent
   * @param filePath - The relative path to the file (from /app)
   * @param content - The file content as base64-encoded string
   * @param encoding - Optional encoding indicator ('utf-8' or 'base64')
   * @throws NotFoundException if agent is not found
   * @throws BadRequestException if path is invalid or content is too large
   */
  async writeFile(agentId: string, filePath: string, content: string, encoding?: 'utf-8' | 'base64'): Promise<void> {
    await this.agentsService.findOne(agentId);
    const agentEntity = await this.agentsRepository.findByIdOrThrow(agentId);

    if (!agentEntity.containerId) {
      throw new NotFoundException(`Agent ${agentId} has no associated container`);
    }

    const containerPath = this.buildContainerPath(filePath);

    // Content is already base64-encoded, so we check the approximate decoded size
    // Base64 is ~33% larger: original_size ≈ base64_length * 3/4
    const approximateOriginalSize = (content.length * 3) / 4;
    if (approximateOriginalSize > this.MAX_FILE_SIZE) {
      throw new BadRequestException(`File content size exceeds maximum allowed size of ${this.MAX_FILE_SIZE} bytes`);
    }

    try {
      const escapedPath = this.escapeForShell(containerPath);
      this.logger.debug(`Escaped path: ${escapedPath}`);
      this.logger.debug(`Content: ${content}`);

      // Write file using base64 decode
      // The content is already base64-encoded, so we just decode it
      // Use sh -c to run the command in a shell so redirection works
      // The base64 content is sent to stdin, which base64 -d reads and decodes
      await this.dockerService.sendCommandToContainer(
        agentEntity.containerId,
        `sh -c "base64 -d > ${escapedPath}"`,
        content,
      );

      this.logger.debug(`File written: ${filePath} for agent ${agentId} (encoding: ${encoding || 'utf-8'})`);
    } catch (error: unknown) {
      const err = error as { message?: string };
      this.logger.error(`Error writing file ${filePath} for agent ${agentId}: ${err.message}`);
      throw error;
    }
  }

  /**
   * List directory contents in agent container.
   * @param agentId - The UUID of the agent
   * @param directoryPath - The relative path to the directory (from /app), defaults to '.'
   * @returns Array of file nodes
   * @throws NotFoundException if agent or directory is not found
   * @throws BadRequestException if path is invalid
   */
  async listDirectory(agentId: string, directoryPath = '.'): Promise<FileNodeDto[]> {
    await this.agentsService.findOne(agentId);
    const agentEntity = await this.agentsRepository.findByIdOrThrow(agentId);

    if (!agentEntity.containerId) {
      throw new NotFoundException(`Agent ${agentId} has no associated container`);
    }

    const containerPath = this.buildContainerPath(directoryPath);

    try {
      // Use a simpler approach: ls to list, then process with find for each item
      // This avoids the complex while loop that might fail silently
      const escapedPath = this.escapeForShell(containerPath);

      // Get list of items using ls -1 (one per line)
      const listCommand = `sh -c "ls -1 ${escapedPath} 2>/dev/null"`;
      let output = await this.dockerService.sendCommandToContainer(agentEntity.containerId, listCommand);

      // Remove invalid characters that might come from Docker protocol parsing
      output = output.replace(/[^a-zA-Z0-9.\-_/ \n]/g, '').trim();

      this.logger.debug(`List directory output for ${containerPath}: ${output.substring(0, 200)}`);

      const nodes: FileNodeDto[] = [];
      const items = output
        .split('\n')
        .map((item) => this.sanitizeFilesystemString(item))
        .filter((item) => item.length > 0);

      // If no items found, return empty array
      if (items.length === 0) {
        this.logger.debug(`No items found in ${containerPath}`);
        return [];
      }

      // Process all items in a single command using find with -exec
      // This is more efficient than one command per item
      const escapedItems = items.map((item) => this.escapeForShell(item)).join(' ');
      const processCommand = `sh -c "for item in ${escapedItems}; do
        fullpath=${escapedPath}/\\$item
        if [ -d \\"\\$fullpath\\" ]; then
          echo \\"directory|\\$item|0|\\$(stat -c %Y \\"\\$fullpath\\" 2>/dev/null || echo 0)\\"
        else
          echo \\"file|\\$item|\\$(stat -c %s \\"\\$fullpath\\" 2>/dev/null || echo 0)|\\$(stat -c %Y \\"\\$fullpath\\" 2>/dev/null || echo 0)\\"
        fi
      done"`;

      let processOutput = await this.dockerService.sendCommandToContainer(agentEntity.containerId, processCommand);
      // Remove invalid characters that might come from Docker protocol parsing
      // Keep pipe separator (|) for parsing, newlines, and valid filename characters
      processOutput = processOutput.replace(/[^a-zA-Z0-9.\-_/ |\n]/g, '').trim();

      this.logger.debug(`Process output: ${processOutput.substring(0, 200)}`);

      const lines = processOutput.split('\n').filter((line) => line.trim().length > 0);

      this.logger.debug(`Parsing ${lines.length} lines from process output`);

      for (const line of lines) {
        // Filter out lines that don't match our expected format (type|name|size|modified)
        // Remove any shell artifacts or invalid characters from the line (but keep the pipe separators)
        // We need to be careful - only remove shell artifacts that aren't part of the data
        const cleanedLine = line.trim();
        const parts = cleanedLine.split('|');

        if (parts.length >= 2) {
          // Sanitize type and name, but be less aggressive - only remove truly invalid characters
          const rawType = parts[0].trim();
          const rawName = parts[1].trim();

          // Remove shell artifacts from type and name
          const type = this.sanitizeFilesystemString(rawType) as 'file' | 'directory';
          const name = this.sanitizeFilesystemString(rawName);

          // Skip if type or name is invalid after sanitization
          if (!type || !name || (type !== 'file' && type !== 'directory')) {
            this.logger.warn(
              `Skipping invalid entry: rawType=${rawType}, rawName=${rawName}, type=${type}, name=${name}`,
            );
            continue;
          }

          const size = parts[2] ? parseInt(parts[2].trim(), 10) : undefined;
          const modifiedTimestamp = parts[3] ? parseInt(parts[3].trim(), 10) : undefined;

          // Build relative path (sanitize the directory path as well)
          const sanitizedDirPath = directoryPath === '.' ? '' : this.sanitizeFilesystemString(directoryPath);
          const relativePath = sanitizedDirPath ? `${sanitizedDirPath}/${name}` : name;

          nodes.push({
            name,
            type,
            path: relativePath,
            size: type === 'file' ? size : undefined,
            modifiedAt: modifiedTimestamp && modifiedTimestamp > 0 ? new Date(modifiedTimestamp * 1000) : undefined,
          });
        }
      }

      // Sort: directories first, then files, both alphabetically
      nodes.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      return nodes;
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (err.message?.includes('No such file') || err.message?.includes('not found')) {
        throw new NotFoundException(`Directory not found: ${directoryPath}`);
      }
      this.logger.error(`Error listing directory ${directoryPath} for agent ${agentId}: ${err.message}`);
      throw error;
    }
  }

  /**
   * Create a file or directory in agent container.
   * @param agentId - The UUID of the agent
   * @param filePath - The relative path to create (from /app)
   * @param type - The type to create ('file' or 'directory')
   * @param content - Optional content for file creation
   * @throws NotFoundException if agent is not found
   * @throws BadRequestException if path is invalid or file already exists
   */
  async createFileOrDirectory(
    agentId: string,
    filePath: string,
    type: 'file' | 'directory',
    content?: string,
  ): Promise<void> {
    await this.agentsService.findOne(agentId);
    const agentEntity = await this.agentsRepository.findByIdOrThrow(agentId);

    if (!agentEntity.containerId) {
      throw new NotFoundException(`Agent ${agentId} has no associated container`);
    }

    const containerPath = this.buildContainerPath(filePath);

    try {
      if (type === 'directory') {
        // Create directory
        await this.dockerService.sendCommandToContainer(
          agentEntity.containerId,
          `mkdir -p ${this.escapeForShell(containerPath)}`,
        );
      } else {
        // Create file with optional content
        if (content !== undefined) {
          // Content should be base64-encoded
          await this.writeFile(agentId, filePath, content, 'utf-8');
        } else {
          // Create empty file
          await this.dockerService.sendCommandToContainer(
            agentEntity.containerId,
            `touch ${this.escapeForShell(containerPath)}`,
          );
        }
      }

      this.logger.debug(`Created ${type}: ${filePath} for agent ${agentId}`);
    } catch (error: unknown) {
      const err = error as { message?: string };
      this.logger.error(`Error creating ${type} ${filePath} for agent ${agentId}: ${err.message}`);
      throw error;
    }
  }

  /**
   * Delete a file or directory from agent container.
   * @param agentId - The UUID of the agent
   * @param filePath - The relative path to delete (from /app)
   * @throws NotFoundException if agent or file is not found
   * @throws BadRequestException if path is invalid
   */
  async deleteFileOrDirectory(agentId: string, filePath: string): Promise<void> {
    await this.agentsService.findOne(agentId);
    const agentEntity = await this.agentsRepository.findByIdOrThrow(agentId);

    if (!agentEntity.containerId) {
      throw new NotFoundException(`Agent ${agentId} has no associated container`);
    }

    const containerPath = this.buildContainerPath(filePath);

    try {
      // Use rm -rf to delete file or directory
      await this.dockerService.sendCommandToContainer(
        agentEntity.containerId,
        `rm -rf ${this.escapeForShell(containerPath)}`,
      );

      this.logger.debug(`Deleted: ${filePath} for agent ${agentId}`);
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (err.message?.includes('No such file') || err.message?.includes('not found')) {
        throw new NotFoundException(`File or directory not found: ${filePath}`);
      }
      this.logger.error(`Error deleting ${filePath} for agent ${agentId}: ${err.message}`);
      throw error;
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
}
