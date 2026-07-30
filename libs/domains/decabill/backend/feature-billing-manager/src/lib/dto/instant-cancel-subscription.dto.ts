import { IsOptional, IsString, MaxLength } from 'class-validator';

export class InstantCancelSubscriptionDto {
  @IsOptional()
  @IsString({ message: 'Reason must be a string' })
  @MaxLength(500)
  reason?: string;
}
