import { Injectable } from '@nestjs/common';

/**
 * Service for retrieving configuration parameters.
 * Provides access to environment-based configuration values.
 */
@Injectable()
export class ConfigService {
  /**
   * Get the Git repository URL from environment variables.
   * @returns The Git repository URL, or undefined if not set
   */
  getGitRepositoryUrl(): string | undefined {
    return process.env.GIT_REPOSITORY_URL;
  }
}
