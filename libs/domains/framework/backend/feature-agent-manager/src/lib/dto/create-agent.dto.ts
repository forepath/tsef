import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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

  @IsOptional()
  @IsString({ message: 'Git repository URL must be a string' })
  gitRepositoryUrl?: string;

  @IsOptional()
  @IsBoolean({ message: 'Create virtual workspace must be a boolean' })
  createVirtualWorkspace?: boolean = true;

  @IsOptional()
  @IsBoolean({ message: 'Create SSH connection must be a boolean' })
  createSshConnection?: boolean = true;
}
