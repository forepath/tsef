import { IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class UpdateSubscriptionItemDisplayNameDto {
  @IsOptional()
  @ValidateIf((_dto, value) => value !== null && value !== undefined)
  @IsString({ message: 'displayName must be a string' })
  @MaxLength(255, { message: 'displayName must be at most 255 characters' })
  displayName?: string | null;
}
