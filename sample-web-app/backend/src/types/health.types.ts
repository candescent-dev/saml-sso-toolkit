/**
 * Interface for health check response
 */
export interface HealthStatus {
  status: string; // Status of the application
  message: string; // Health message
  timestamp: string; // ISO timestamp
}
