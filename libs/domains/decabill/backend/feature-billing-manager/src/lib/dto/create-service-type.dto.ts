import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, IsObject, ValidateIf } from 'class-validator';

export class CreateServiceTypeDto {
  @IsNotEmpty({ message: 'Key is required' })
  @IsString({ message: 'Key must be a string' })
  key!: string;

  @IsNotEmpty({ message: 'Name is required' })
  @IsString({ message: 'Name must be a string' })
  name!: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  /**
   * Primary provider id (first of allowedProviders). Null/empty with empty allowedProviders means None.
   * When omitted, derived from allowedProviders[0].
   */
  @IsOptional()
  @ValidateIf((_, value) => value != null && value !== '')
  @IsString({ message: 'Provider must be a string' })
  provider?: string | null;

  /**
   * Interchangeable provider ids (order preserved; first is primary). Empty means None.
   */
  @IsOptional()
  @IsArray({ message: 'allowedProviders must be an array' })
  @IsString({ each: true, message: 'Each allowed provider must be a string' })
  allowedProviders?: string[];

  @IsOptional()
  @IsObject({ message: 'Config schema must be an object' })
  configSchema?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'disallowStatutoryWithdrawal must be a boolean' })
  disallowStatutoryWithdrawal?: boolean;

  @IsOptional()
  @IsObject({ message: 'providerDefaults must be an object' })
  providerDefaults?: Record<string, string>;
}
