import { BackorderStatus } from '../entities/backorder.entity';

export class BackorderResponseDto {
  id!: string;
  userId!: string;
  serviceTypeId!: string;
  planId!: string;
  /** Denormalized plan display name when the plan row is available. */
  planName?: string;
  status!: BackorderStatus;
  failureReason?: string;
  requestedConfigSnapshot!: Record<string, unknown>;
  providerErrors!: Record<string, unknown>;
  preferredAlternatives!: Record<string, unknown>;
  retryAfter?: Date;
  periodTotalPrice?: number;
  createdAt!: Date;
  updatedAt!: Date;
}
