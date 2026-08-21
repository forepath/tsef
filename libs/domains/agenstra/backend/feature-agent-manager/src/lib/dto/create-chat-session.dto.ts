import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for creating a user-visible chat session under an agent.
 */
export class CreateChatSessionDto {
  @IsOptional()
  @IsString({ message: 'Title must be a string' })
  @MaxLength(255, { message: 'Title must be at most 255 characters' })
  title?: string;
}
