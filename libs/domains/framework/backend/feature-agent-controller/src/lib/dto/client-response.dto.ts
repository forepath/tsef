import { ConfigResponseDto } from '@forepath/framework/backend/feature-agent-manager';
import { AuthenticationType } from '../entities/client.entity';

/**
 * DTO for client API responses.
 * Excludes sensitive information like API key.
 */
export class ClientResponseDto {
  id!: string;
  name!: string;
  description?: string;
  endpoint!: string;
  authenticationType!: AuthenticationType;
  config?: ConfigResponseDto;
  createdAt!: Date;
  updatedAt!: Date;
}
