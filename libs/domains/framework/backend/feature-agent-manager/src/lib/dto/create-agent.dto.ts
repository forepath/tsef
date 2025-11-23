import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * DTO for creating a new agent.
 * Password is auto-generated and returned in the response.
 */
export class CreateAgentDto {
  @IsNotEmpty({ message: 'Name is required' })
  @IsString({ message: 'Name must be a string' })
  name!: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @IsOptional()
  @IsString({ message: 'Agent type must be a string' })
  @IsIn(['cursor'], { message: 'Agent type must be one of: cursor' })
  agentType?: string;
}
