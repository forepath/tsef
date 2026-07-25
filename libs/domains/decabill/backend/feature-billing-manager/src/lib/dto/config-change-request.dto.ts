import { IsArray, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * Mid-life configuration change for an active subscription.
 * Location is intentionally not changeable: moving a provisioned server across
 * regions is a re-provision, not an in-place change.
 */
export class ConfigChangeRequestDto {
  /** Target provider server type (must be offered by the plan). */
  @IsOptional()
  @IsString({ message: 'Server type must be a string' })
  serverType?: string;

  @IsOptional()
  @IsArray({ message: 'Addon IDs to add must be an array' })
  @IsUUID('4', { each: true, message: 'Each addon ID must be a UUID' })
  addAddonIds?: string[];

  @IsOptional()
  @IsArray({ message: 'Addon IDs to remove must be an array' })
  @IsUUID('4', { each: true, message: 'Each addon ID must be a UUID' })
  removeAddonIds?: string[];

  /** Per-addon config keyed by addon UUID; only allowed for addons being added. */
  @IsOptional()
  @IsObject({ message: 'Addon configs must be an object' })
  addonConfigs?: Record<string, Record<string, string>>;
}
