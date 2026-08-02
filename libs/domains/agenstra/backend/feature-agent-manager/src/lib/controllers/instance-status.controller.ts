import { Controller, Get } from '@nestjs/common';

import { InstanceStatusResponseDto } from '../dto/instance-status-response.dto';
import { InstanceStatusService } from '../services/instance-status.service';

@Controller('instance-status')
export class InstanceStatusController {
  constructor(private readonly instanceStatusService: InstanceStatusService) {}

  @Get()
  async getInstanceStatus(): Promise<InstanceStatusResponseDto> {
    return await this.instanceStatusService.getStatus();
  }
}
