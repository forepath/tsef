import { UserRole, assertPatScopes, getUserFromRequest, type RequestWithUser } from '@forepath/identity/backend';
import { ForbiddenException } from '@nestjs/common';
import type { Request } from 'express';

export function assertUpdatesAdmin(req: Request): void {
  const u = getUserFromRequest(req as RequestWithUser);

  if (!u.isApiKeyAuth && u.userRole !== UserRole.ADMIN) {
    throw new ForbiddenException('Admin only');
  }

  assertPatScopes(u, 'updates:admin');
}
