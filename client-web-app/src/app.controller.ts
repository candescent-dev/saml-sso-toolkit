import { Controller, Get } from '@nestjs/common';
import type { HealthStatus } from './types/health.types';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  /**
   * Health check endpoint
   * @returns HealthStatus object containing status, message, and timestamp
   */
  @Get('health')
  getHealth(): HealthStatus {
    return this.appService.getHealth();
  }
}
