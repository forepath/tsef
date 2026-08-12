import type { MeterAggregator } from '../entities/meter.entity';

export class MeterHistorySeriesPointDto {
  period!: string;
  value!: number;
}

export class MeterHistorySeriesDto {
  meterId!: string;
  key!: string;
  name!: string;
  unitLabel?: string | null;
  aggregator!: MeterAggregator;
  attachmentType!: 'plan' | 'addon';
  addonId?: string | null;
  addonName?: string | null;
  series!: MeterHistorySeriesPointDto[];
  totalValue!: number;
}

export class SubscriptionMeterHistoryDto {
  subscriptionId!: string;
  from!: string;
  to!: string;
  groupBy!: 'day' | 'month';
  meters!: MeterHistorySeriesDto[];
}
