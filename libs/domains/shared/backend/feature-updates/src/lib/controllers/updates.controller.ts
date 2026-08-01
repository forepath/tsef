import { Controller, Get, HttpCode, HttpStatus, Inject, Post, Req, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';

import { UPDATES_MODULE_OPTIONS } from '../constants/updates.constants';
import type { UpdatesFullStateDto, UpdatesStatusSummaryDto, UpdateCheckTriggerResultDto } from '../dto/updates.dto';
import type { UpdatesModuleOptions } from '../interfaces/updates-module.options';
import { UpdateCheckService } from '../services/update-check.service';
import { UpdatesQueryService } from '../services/updates-query.service';

/** Must match identity `REQUIRE_SCOPES_KEY` (avoid shared→identity dependency). */
const REQUIRE_SCOPES_KEY = 'identity.require_scopes';

export class UpdatesController {
  constructor(
    private readonly updatesQueryService: UpdatesQueryService,
    private readonly updateCheckService: UpdateCheckService,
    @Inject(UPDATES_MODULE_OPTIONS) private readonly options: UpdatesModuleOptions,
  ) {}

  private assertAdmin(req: Request): void {
    this.options.assertAdmin(req);
  }

  @Get()
  async getFullState(@Req() req: Request): Promise<UpdatesFullStateDto> {
    this.assertAdmin(req);

    return await this.updatesQueryService.getFullState();
  }

  @Get('status')
  async getStatusSummary(@Req() req: Request): Promise<UpdatesStatusSummaryDto> {
    this.assertAdmin(req);

    return await this.updatesQueryService.getStatusSummary();
  }

  @Post('check')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerCheck(@Req() req: Request): Promise<UpdateCheckTriggerResultDto> {
    this.assertAdmin(req);

    return await this.updateCheckService.triggerCheck();
  }
}

export function createUpdatesController(controllerPath: string): typeof UpdatesController {
  @Controller(controllerPath)
  @SetMetadata(REQUIRE_SCOPES_KEY, ['updates:admin'])
  class ConfiguredUpdatesController extends UpdatesController {}

  Object.defineProperty(ConfiguredUpdatesController, 'name', {
    value: `UpdatesController_${controllerPath.replace(/\W+/g, '_')}`,
  });

  return ConfiguredUpdatesController;
}
