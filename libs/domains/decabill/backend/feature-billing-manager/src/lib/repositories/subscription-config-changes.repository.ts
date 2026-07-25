import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  SubscriptionConfigChangeEntity,
  type SubscriptionConfigChangeStatus,
} from '../entities/subscription-config-change.entity';
import { applyUserTenantFilter, getRequiredTenantId } from '../utils/tenant-query.utils';

/**
 * Config changes have no own tenant column; they inherit it from the owning subscription's user.
 * Bulk UPDATE statements cannot join, so they filter through this subquery instead.
 */
const TENANT_SCOPE_CONDITION = `subscription_id IN (
  SELECT s.id FROM billing_subscriptions s INNER JOIN users u ON u.id = s.user_id WHERE u.tenant_id = :tenantId
)`;

export interface ConfigChangeTransitionFields {
  billingOutcome?: SubscriptionConfigChangeEntity['billingOutcome'];
  errorCode?: string | null;
  errorMessage?: string | null;
  processedAt?: Date | null;
  processingStartedAt?: Date | null;
  reclaimCount?: number;
}

@Injectable()
export class SubscriptionConfigChangesRepository {
  constructor(
    @InjectRepository(SubscriptionConfigChangeEntity)
    private readonly repository: Repository<SubscriptionConfigChangeEntity>,
  ) {}

  async create(dto: Partial<SubscriptionConfigChangeEntity>): Promise<SubscriptionConfigChangeEntity> {
    const entity = this.repository.create(dto);

    return await this.repository.save(entity);
  }

  async findById(id: string): Promise<SubscriptionConfigChangeEntity | null> {
    const qb = this.repository
      .createQueryBuilder('change')
      .innerJoin('billing_subscriptions', 'sub', 'sub.id = change.subscription_id')
      .innerJoin('users', 'user', 'user.id = sub.user_id')
      .where('change.id = :id', { id });

    applyUserTenantFilter(qb, 'user');

    return await qb.getOne();
  }

  async findLatestForSubscription(subscriptionId: string): Promise<SubscriptionConfigChangeEntity | null> {
    const qb = this.repository
      .createQueryBuilder('change')
      .innerJoin('billing_subscriptions', 'sub', 'sub.id = change.subscription_id')
      .innerJoin('users', 'user', 'user.id = sub.user_id')
      .where('change.subscription_id = :subscriptionId', { subscriptionId })
      .orderBy('change.createdAt', 'DESC')
      .take(1);

    applyUserTenantFilter(qb, 'user');

    return await qb.getOne();
  }

  async findPendingIds(limit = 100): Promise<string[]> {
    const qb = this.repository
      .createQueryBuilder('change')
      .select('change.id', 'id')
      .innerJoin('billing_subscriptions', 'sub', 'sub.id = change.subscription_id')
      .innerJoin('users', 'user', 'user.id = sub.user_id')
      .where('change.status = :status', { status: 'pending' })
      .orderBy('change.requestedAt', 'ASC')
      .take(limit);

    applyUserTenantFilter(qb, 'user');

    const rows = await qb.getRawMany<{ id: string }>();

    return rows.map((row) => row.id);
  }

  /**
   * Rows that entered `processing` before the given cut-off, i.e. a worker died mid-run.
   */
  async findStuckProcessing(before: Date, limit = 100): Promise<SubscriptionConfigChangeEntity[]> {
    const qb = this.repository
      .createQueryBuilder('change')
      .innerJoin('billing_subscriptions', 'sub', 'sub.id = change.subscription_id')
      .innerJoin('users', 'user', 'user.id = sub.user_id')
      .where('change.status = :status', { status: 'processing' })
      .andWhere('change.processingStartedAt IS NOT NULL')
      .andWhere('change.processingStartedAt < :before', { before })
      .orderBy('change.processingStartedAt', 'ASC')
      .take(limit);

    applyUserTenantFilter(qb, 'user');

    return await qb.getMany();
  }

  /**
   * Compare-and-set claim: only one worker can move a row from `pending` to `processing`.
   * Returns the claimed row, or null when another worker won the race.
   *
   * `reclaimCount` on the returned row is the claim generation: every later mutation must pass
   * that value so a timed-out worker cannot keep writing after the watchdog reclaims the row.
   */
  async claimForProcessing(id: string): Promise<SubscriptionConfigChangeEntity | null> {
    const result = await this.repository
      .createQueryBuilder()
      .update(SubscriptionConfigChangeEntity)
      .set({ status: 'processing', processingStartedAt: new Date() })
      .where('id = :id', { id })
      .andWhere('status = :expected', { expected: 'pending' })
      .andWhere(TENANT_SCOPE_CONDITION, { tenantId: getRequiredTenantId() })
      .execute();

    if (!result.affected) {
      return null;
    }

    return await this.findById(id);
  }

  /**
   * Transitions a claimed row out of `processing`. Returns false when the claim was lost
   * (e.g. the watchdog reclaimed the row), so callers can skip their side effects.
   */
  async transitionFromProcessing(
    id: string,
    status: Extract<SubscriptionConfigChangeStatus, 'completed' | 'failed' | 'pending'>,
    fields: ConfigChangeTransitionFields = {},
    claimGeneration: number,
  ): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .update(SubscriptionConfigChangeEntity)
      .set({ status, ...fields })
      .where('id = :id', { id })
      .andWhere('status = :expected', { expected: 'processing' })
      .andWhere('reclaim_count = :claimGeneration', { claimGeneration })
      .andWhere(TENANT_SCOPE_CONDITION, { tenantId: getRequiredTenantId() })
      .execute();

    return (result.affected ?? 0) > 0;
  }

  /**
   * Appends a step key to `applied_steps` in a single atomic statement, so concurrent or
   * retried workers cannot duplicate a step. Returns false when the step was already
   * recorded or the row is no longer owned by this claim generation.
   */
  async appendAppliedStep(id: string, stepKey: string, claimGeneration: number): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .update(SubscriptionConfigChangeEntity)
      .set({ appliedSteps: () => `applied_steps || to_jsonb(:stepKey::text)` })
      .where('id = :id', { id })
      .andWhere('status = :expected', { expected: 'processing' })
      .andWhere('reclaim_count = :claimGeneration', { claimGeneration })
      .andWhere('NOT (applied_steps @> to_jsonb(:stepKey::text))')
      .andWhere(TENANT_SCOPE_CONDITION, { tenantId: getRequiredTenantId() })
      .setParameter('stepKey', stepKey)
      .execute();

    return (result.affected ?? 0) > 0;
  }

  /**
   * Reserves one-shot billing while still processing under this claim generation.
   * Returns false when another worker already claimed billing or the claim was lost.
   */
  async claimBillingSlot(id: string, claimGeneration: number): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .update(SubscriptionConfigChangeEntity)
      .set({ billingOutcome: 'deferred' })
      .where('id = :id', { id })
      .andWhere('status = :expected', { expected: 'processing' })
      .andWhere('reclaim_count = :claimGeneration', { claimGeneration })
      .andWhere('billing_outcome IS NULL')
      .andWhere(TENANT_SCOPE_CONDITION, { tenantId: getRequiredTenantId() })
      .execute();

    return (result.affected ?? 0) > 0;
  }
}
