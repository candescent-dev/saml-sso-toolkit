import { Injectable } from '@nestjs/common';
import type { HealthStatus } from './types/health.types';

@Injectable()
export class AppService {
  /**
   * Returns health status of the application
   * @returns HealthStatus object with status, message, and timestamp
   */
  getHealth(): HealthStatus {
    return {
      status: 'ok',
      message: 'Hello',
      timestamp: new Date().toISOString(), // Current timestamp in ISO format
    };
  }
}
