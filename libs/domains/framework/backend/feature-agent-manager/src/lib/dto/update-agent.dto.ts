import { IsIn, IsOptional, IsString } from 'class-validator';

/**
 * DTO for updating an existing agent.
 * All fields are optional to support partial updates.
 * Note: Password cannot be updated after creation.
 */
export class UpdateAgentDto {
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @IsOptional()
  @IsString({ message: 'Agent type must be a string' })
  @IsIn(['cursor'], { message: 'Agent type must be one of: cursor' })
  agentType?: string;
}
