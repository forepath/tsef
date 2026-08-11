import { KeycloakRoles, RequireScopes, UserRole, UsersRoles } from '@forepath/identity/backend';
import { BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';

import { ServerInfoResponseDto } from '../dto/server-info-response.dto';
import {
  SubscriptionItemDetailResponseDto,
  SubscriptionItemResponseDto,
} from '../dto/subscription-item-response.dto';
import { UpdateSubscriptionItemDisplayNameDto } from '../dto/update-subscription-item-display-name.dto';
import { SubscriptionItemServerService } from '../services/subscription-item-server.service';
import { toServerInfoResponse } from '../utils/subscription-item-response.utils';
import { ensureAdmin, getUserFromRequest, type RequestWithUser } from '../utils/billing-access.utils';

@Controller('admin/billing/subscriptions/:subscriptionId/items')
@KeycloakRoles(UserRole.ADMIN)
@UsersRoles(UserRole.ADMIN)
export class AdminSubscriptionItemsController {
  constructor(private readonly subscriptionItemServerService: SubscriptionItemServerService) {}

  @Get(':itemId')
  @RequireScopes('subscriptions:read')
  async getItemDetail(
    @Param('subscriptionId', new ParseUUIDPipe({ version: '4' })) subscriptionId: string,
    @Param('itemId', new ParseUUIDPipe({ version: '4' })) itemId: string,
    @Req() req?: RequestWithUser,
  ): Promise<SubscriptionItemDetailResponseDto> {
    const userInfo = getUserFromRequest(req ?? ({} as RequestWithUser));
    ensureAdmin(userInfo);

    return await this.subscriptionItemServerService.getItemDetailAsAdmin(subscriptionId, itemId);
  }

  @Post(':itemId/display-name')
  @RequireScopes('subscriptions:write')
  async updateDisplayName(
    @Param('subscriptionId', new ParseUUIDPipe({ version: '4' })) subscriptionId: string,
    @Param('itemId', new ParseUUIDPipe({ version: '4' })) itemId: string,
    @Body() dto: UpdateSubscriptionItemDisplayNameDto,
    @Req() req?: RequestWithUser,
  ): Promise<SubscriptionItemResponseDto> {
    const userInfo = getUserFromRequest(req ?? ({} as RequestWithUser));
    ensureAdmin(userInfo);

    return await this.subscriptionItemServerService.updateDisplayNameAsAdmin(
      subscriptionId,
      itemId,
      dto.displayName ?? null,
    );
  }

  @Get(':itemId/server-info')
  @RequireScopes('subscriptions:read')
  async getServerInfo(
    @Param('subscriptionId', new ParseUUIDPipe({ version: '4' })) subscriptionId: string,
    @Param('itemId', new ParseUUIDPipe({ version: '4' })) itemId: string,
    @Req() req?: RequestWithUser,
  ): Promise<ServerInfoResponseDto> {
    const userInfo = getUserFromRequest(req ?? ({} as RequestWithUser));
    ensureAdmin(userInfo);

    const info = await this.subscriptionItemServerService.getServerInfoAsAdmin(subscriptionId, itemId);

    return toServerInfoResponse(info);
  }

  @Post(':itemId/actions/start')
  @RequireScopes('subscriptions:write')
  async startServer(
    @Param('subscriptionId', new ParseUUIDPipe({ version: '4' })) subscriptionId: string,
    @Param('itemId', new ParseUUIDPipe({ version: '4' })) itemId: string,
    @Req() req?: RequestWithUser,
  ): Promise<{ success: boolean }> {
    const userInfo = getUserFromRequest(req ?? ({} as RequestWithUser));

    if (!userInfo.userId) {
      throw new BadRequestException('User not authenticated');
    }

    ensureAdmin(userInfo);
    await this.subscriptionItemServerService.startServerAsAdmin(subscriptionId, itemId, userInfo.userId);

    return { success: true };
  }

  @Post(':itemId/actions/stop')
  @RequireScopes('subscriptions:write')
  async stopServer(
    @Param('subscriptionId', new ParseUUIDPipe({ version: '4' })) subscriptionId: string,
    @Param('itemId', new ParseUUIDPipe({ version: '4' })) itemId: string,
    @Req() req?: RequestWithUser,
  ): Promise<{ success: boolean }> {
    const userInfo = getUserFromRequest(req ?? ({} as RequestWithUser));

    if (!userInfo.userId) {
      throw new BadRequestException('User not authenticated');
    }

    ensureAdmin(userInfo);
    await this.subscriptionItemServerService.stopServerAsAdmin(subscriptionId, itemId, userInfo.userId);

    return { success: true };
  }

  @Post(':itemId/actions/restart')
  @RequireScopes('subscriptions:write')
  async restartServer(
    @Param('subscriptionId', new ParseUUIDPipe({ version: '4' })) subscriptionId: string,
    @Param('itemId', new ParseUUIDPipe({ version: '4' })) itemId: string,
    @Req() req?: RequestWithUser,
  ): Promise<{ success: boolean }> {
    const userInfo = getUserFromRequest(req ?? ({} as RequestWithUser));

    if (!userInfo.userId) {
      throw new BadRequestException('User not authenticated');
    }

    ensureAdmin(userInfo);
    await this.subscriptionItemServerService.restartServerAsAdmin(subscriptionId, itemId, userInfo.userId);

    return { success: true };
  }
}
