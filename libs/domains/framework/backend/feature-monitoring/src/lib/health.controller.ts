import { Controller, Get } from '@nestjs/common';
import { Public } from 'nest-keycloak-connect';

/**
 * Health check response DTO.
 */
export interface HealthResponseDto {
  status: 'ok';
  timestamp: number;
}

/**
 * Controller for health check endpoints.
 * Provides health status for monitoring and load balancer checks.
 */
@Public()
@Controller('health')
export class HealthController {
  /**
   * Get health status of the application.
   * @returns Health status with timestamp
   */
  @Get()
  getHealth(): HealthResponseDto {
    return {
      status: 'ok',
      timestamp: Date.now(),
    };
  }
}
