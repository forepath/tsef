import { KeycloakRoles, RequireScopes, UserRole, UsersRoles } from '@forepath/identity/backend';
import { Controller, Get, Param, ParseUUIDPipe, Req } from '@nestjs/common';

import type {
  ContainerManagerContainersResponseDto,
  ContainerManagerNetworksResponseDto,
  ContainerManagerStatsHistoryResponseDto,
} from '../dto/container-manager.dto';
import { ContainerManagerService } from '../services/container-manager.service';
import { ensureAdmin, getUserFromRequest, type RequestWithUser } from '../utils/billing-access.utils';

@Controller('admin/billing/subscriptions/:subscriptionId/items/:itemId/container-manager')
@KeycloakRoles(UserRole.ADMIN)
@UsersRoles(UserRole.ADMIN)
export class AdminContainerManagerController {
  constructor(private readonly containerManagerService: ContainerManagerService) {}

  @Get('containers')
  @RequireScopes('billing_admin:read')
  async listContainers(
    @Param('subscriptionId', new ParseUUIDPipe({ version: '4' })) subscriptionId: string,
    @Param('itemId', new ParseUUIDPipe({ version: '4' })) itemId: string,
    @Req() req?: RequestWithUser,
  ): Promise<ContainerManagerContainersResponseDto> {
    const userInfo = getUserFromRequest(req ?? ({} as RequestWithUser));
    ensureAdmin(userInfo);

    return await this.containerManagerService.listContainers(subscriptionId, itemId, { asAdmin: true });
  }

  @Get('containers/:containerId/stats-history')
  @RequireScopes('billing_admin:read')
  async getStatsHistory(
    @Param('subscriptionId', new ParseUUIDPipe({ version: '4' })) subscriptionId: string,
    @Param('itemId', new ParseUUIDPipe({ version: '4' })) itemId: string,
    @Param('containerId') containerId: string,
    @Req() req?: RequestWithUser,
  ): Promise<ContainerManagerStatsHistoryResponseDto> {
    const userInfo = getUserFromRequest(req ?? ({} as RequestWithUser));
    ensureAdmin(userInfo);

    return await this.containerManagerService.getStatsHistory(subscriptionId, itemId, containerId, {
      asAdmin: true,
    });
  }

  @Get('networks')
  @RequireScopes('billing_admin:read')
  async listNetworks(
    @Param('subscriptionId', new ParseUUIDPipe({ version: '4' })) subscriptionId: string,
    @Param('itemId', new ParseUUIDPipe({ version: '4' })) itemId: string,
    @Req() req?: RequestWithUser,
  ): Promise<ContainerManagerNetworksResponseDto> {
    const userInfo = getUserFromRequest(req ?? ({} as RequestWithUser));
    ensureAdmin(userInfo);

    return await this.containerManagerService.listNetworks(subscriptionId, itemId, { asAdmin: true });
  }
}
