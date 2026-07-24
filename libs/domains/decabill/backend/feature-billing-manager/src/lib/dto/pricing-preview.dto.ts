import { ArrayUnique, IsArray, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class PricingPreviewDto {
  @IsOptional()
  @IsString({ message: 'Plan ID must be a string' })
  planId?: string;

  @IsOptional()
  @IsObject({ message: 'Requested config must be an object' })
  requestedConfig?: Record<string, unknown>;

  @IsOptional()
  @IsArray({ message: 'Addon IDs must be an array' })
  @ArrayUnique()
  @IsUUID('4', { each: true, message: 'Each addon ID must be a UUID' })
  addonIds?: string[];
}
