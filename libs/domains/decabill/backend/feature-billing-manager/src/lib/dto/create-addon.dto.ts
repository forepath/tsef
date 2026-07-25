import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

import type { AddonImplementationType } from '../entities/addon.entity';
import { BillingIntervalType } from '../entities/service-plan.entity';

const IMPLEMENTATION_TYPES: AddonImplementationType[] = ['module', 'cloud_init_script'];
const INTERVAL_TYPES = Object.values(BillingIntervalType);

export class CreateAddonDto {
  @IsNotEmpty({ message: 'Key is required' })
  @IsString({ message: 'Key must be a string' })
  key!: string;

  @IsNotEmpty({ message: 'Name is required' })
  @IsString({ message: 'Name must be a string' })
  name!: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @IsNotEmpty({ message: 'Implementation type is required' })
  @IsIn(IMPLEMENTATION_TYPES, { message: 'Invalid implementation type' })
  implementationType!: AddonImplementationType;

  @ValidateIf((dto: CreateAddonDto) => dto.implementationType === 'module')
  @IsNotEmpty({ message: 'Module key is required for module addons' })
  @IsString({ message: 'Module key must be a string' })
  moduleKey?: string;

  @ValidateIf((dto: CreateAddonDto) => dto.implementationType === 'cloud_init_script')
  @IsNotEmpty({ message: 'Script template is required for cloud_init_script addons' })
  @IsString({ message: 'Script template must be a string' })
  scriptTemplate?: string;

  @IsOptional()
  @IsObject({ message: 'Config schema must be an object' })
  configSchema?: Record<string, unknown>;

  @IsOptional()
  @IsObject({ message: 'Default values must be an object' })
  defaultValues?: Record<string, string>;

  @IsOptional()
  @IsArray({ message: 'Compatible providers must be an array' })
  @ArrayUnique()
  @IsString({ each: true, message: 'Each compatible provider must be a string' })
  compatibleProviders?: string[];

  @IsOptional()
  @IsNumberString({}, { message: 'Base price must be a numeric string' })
  basePrice?: string;

  @ValidateIf((dto: CreateAddonDto) => dto.basePrice !== undefined && dto.basePrice !== null && dto.basePrice !== '')
  @IsIn(INTERVAL_TYPES, { message: 'Invalid price interval type' })
  priceIntervalType?: BillingIntervalType;

  @ValidateIf((dto: CreateAddonDto) => dto.basePrice !== undefined && dto.basePrice !== null && dto.basePrice !== '')
  @Type(() => Number)
  @IsInt({ message: 'Price interval value must be an integer' })
  @Min(1, { message: 'Price interval value must be at least 1' })
  priceIntervalValue?: number;

  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;
}
