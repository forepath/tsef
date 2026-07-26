import { ExecutionContext, Injectable } from '@nestjs/common';
import {
  AuthGuard as KeycloakAuthGuard,
  ResourceGuard as KeycloakResourceGuard,
  RoleGuard as KeycloakRoleGuard,
} from 'nest-keycloak-connect';

import { isBullBoardRequestPath } from './bull-board-request-path';
import { getHttpRequestPath } from './http-request-path.util';
import { isOtelMetricsRequestPath } from './otel-metrics-request-path';

function shouldSkipForOpsBasicAuth(context: ExecutionContext): boolean {
  const path = getHttpRequestPath(context);

  return isBullBoardRequestPath(path) || isOtelMetricsRequestPath(path);
}

function isPatAuthenticated(context: ExecutionContext): boolean {
  const request = context.switchToHttp().getRequest<{ patAuthenticated?: boolean }>();

  return request.patAuthenticated === true;
}

function shouldSkipKeycloakGuard(context: ExecutionContext): boolean {
  return shouldSkipForOpsBasicAuth(context) || isPatAuthenticated(context);
}

/** Keycloak AuthGuard that skips Bull Board / OTEL metrics routes and app-signed PAT JWTs. */
@Injectable()
export class BullBoardSkippingAuthGuard extends KeycloakAuthGuard {
  canActivate(context: ExecutionContext): Promise<boolean> {
    if (shouldSkipKeycloakGuard(context)) {
      return Promise.resolve(true);
    }

    return super.canActivate(context);
  }
}

/** Keycloak ResourceGuard that skips Bull Board / OTEL metrics routes and app-signed PAT JWTs. */
@Injectable()
export class BullBoardSkippingResourceGuard extends KeycloakResourceGuard {
  canActivate(context: ExecutionContext): Promise<boolean> {
    if (shouldSkipKeycloakGuard(context)) {
      return Promise.resolve(true);
    }

    return super.canActivate(context);
  }
}

/** Keycloak RoleGuard that skips Bull Board / OTEL metrics routes and app-signed PAT JWTs. */
@Injectable()
export class BullBoardSkippingRoleGuard extends KeycloakRoleGuard {
  canActivate(context: ExecutionContext): Promise<boolean> {
    if (shouldSkipKeycloakGuard(context)) {
      return Promise.resolve(true);
    }

    return super.canActivate(context);
  }
}
