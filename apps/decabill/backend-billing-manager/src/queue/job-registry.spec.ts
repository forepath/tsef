import { BillingJobName, getBillingRepeatableJobs } from './job-registry';

describe('billing job-registry', () => {
  it('defines coordinator job names', () => {
    expect(BillingJobName.SUBSCRIPTION_BILLING_COORDINATOR).toBe('subscription-billing.coordinator');
    expect(BillingJobName.BACKORDER_RETRY_UNIT).toBe('backorder-retry.unit');
  });

  it('getBillingRepeatableJobs includes core coordinators and optional DATEV export', () => {
    const jobs = getBillingRepeatableJobs();

    expect(jobs.length).toBeGreaterThanOrEqual(7);
    expect(jobs.map((job) => job.name)).toContain(BillingJobName.WEBHOOK_DELIVERY_RETENTION_COORDINATOR);
    expect(jobs.map((job) => job.name)).toContain(BillingJobName.INVOICE_AUTO_PAYMENT_COORDINATOR);
    expect(jobs.map((job) => job.name)).toContain(BillingJobName.SUBSCRIPTION_INSTANT_CANCEL_COORDINATOR);

    delete process.env.BILLING_DATEV_EXPORT_ENABLED;
    const withDatev = getBillingRepeatableJobs();
    expect(withDatev.map((job) => job.name)).toContain(BillingJobName.DATEV_EXPORT_COORDINATOR);

    process.env.BILLING_DATEV_EXPORT_ENABLED = 'false';
    const withoutDatev = getBillingRepeatableJobs();
    expect(withoutDatev.map((job) => job.name)).not.toContain(BillingJobName.DATEV_EXPORT_COORDINATOR);
    delete process.env.BILLING_DATEV_EXPORT_ENABLED;
  });

  it('getBillingRepeatableJobs includes optional price recalc coordinator', () => {
    delete process.env.BILLING_PRICE_RECALC_ENABLED;
    const withPriceRecalc = getBillingRepeatableJobs();
    expect(withPriceRecalc.map((job) => job.name)).toContain(BillingJobName.PRICE_RECALC_COORDINATOR);

    const priceRecalcJob = withPriceRecalc.find((job) => job.name === BillingJobName.PRICE_RECALC_COORDINATOR);
    expect(priceRecalcJob?.pattern).toBe('0 0 * * *');
    expect(priceRecalcJob?.tz).toBe('Europe/Berlin');

    process.env.BILLING_PRICE_RECALC_ENABLED = 'false';
    const withoutPriceRecalc = getBillingRepeatableJobs();
    expect(withoutPriceRecalc.map((job) => job.name)).not.toContain(BillingJobName.PRICE_RECALC_COORDINATOR);
    delete process.env.BILLING_PRICE_RECALC_ENABLED;
  });

  it('getBillingRepeatableJobs includes update check coordinator', () => {
    const jobs = getBillingRepeatableJobs();
    const updateCheckJob = jobs.find((job) => job.name === BillingJobName.UPDATE_CHECK);

    expect(updateCheckJob).toBeDefined();
    expect(updateCheckJob?.pattern).toBe('0 0 * * *');
    expect(updateCheckJob?.tz).toBe('Europe/Berlin');
  });

  it('coordinator job ids are valid for BullMQ (no colons)', () => {
    for (const job of getBillingRepeatableJobs()) {
      expect(job.coordinatorJobId).not.toContain(':');
      expect(job.coordinatorJobId.startsWith('coordinator.')).toBe(true);
      expect(job.everyMs != null || job.pattern != null).toBe(true);
    }
  });
});
