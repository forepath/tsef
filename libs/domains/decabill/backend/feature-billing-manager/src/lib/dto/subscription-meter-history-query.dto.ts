import { IsDateString, IsIn, IsOptional } from 'class-validator';

export class SubscriptionMeterHistoryQueryDto {
  @IsDateString({ strict: true })
  from!: string;

  @IsDateString({ strict: true })
  to!: string;

  @IsOptional()
  @IsIn(['day', 'month'])
  groupBy: 'day' | 'month' = 'day';
}
