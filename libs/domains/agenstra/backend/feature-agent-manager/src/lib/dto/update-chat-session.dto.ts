import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * DTO for renaming a user-visible chat session.
 */
export class UpdateChatSessionDto {
  @IsNotEmpty({ message: 'Title is required' })
  @IsString({ message: 'Title must be a string' })
  @MaxLength(255, { message: 'Title must be at most 255 characters' })
  title!: string;
}
