import { recordSharedCounter } from '@forepath/shared/backend/util-otel/metrics';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerLimitDetail } from '@nestjs/throttler';

import { isBullBoardRequestPath } from './bull-board-request-path';
import { getHttpRequestPath } from './http-request-path.util';
import { isOtelMetricsRequestPath } from './otel-metrics-request-path';

/** Skips rate limiting on Bull Board and OTEL metrics routes. */
@Injectable()
export class BullBoardSkippingThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const path = getHttpRequestPath(context);

    if (isBullBoardRequestPath(path) || isOtelMetricsRequestPath(path)) {
      return true;
    }

    return super.shouldSkip(context);
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    recordSharedCounter('rate_limit.rejected_total');
    await super.throwThrottlingException(context, throttlerLimitDetail);
  }
}
