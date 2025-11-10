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
  createdAt!: Date;
  updatedAt!: Date;
}
