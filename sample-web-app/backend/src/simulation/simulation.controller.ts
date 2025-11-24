import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { SimulationService } from './simulation.service';
import { SimulationDto } from './dto/simulation.dto';

/**
 * Interface representing the response structure from the simulation endpoint.
 */
interface SimulationResponse {
  success: boolean;
  data?: Record<string, unknown>;
  message?: string;
}

/**
 * Controller responsible for handling simulation-related routes.
 */
@Controller('simulation')
export class SimulationController {
  constructor(private readonly simulationService: SimulationService) {}

  /**
   * POST /simulation
   * Accepts simulation request from frontend and delegates processing to service.
   * @param simulationDto - validated request body with ACS URL, encryption key, and attributes
   * @returns success response with simulation result or throws HttpException on error
   */
  @Post()
  public async runSimulation(@Body() simulationDto: SimulationDto): Promise<SimulationResponse> {
    try {
      // Call service to process the SAML simulation
      const result: Record<string, unknown> =
        await this.simulationService.processSimulation(simulationDto);
      return { success: true, data: result };
    } catch (error: unknown) {
      // Ensure strict typing for error message
      const message = error instanceof Error ? error.message : 'Simulation failed';
      throw new HttpException({ success: false, message }, HttpStatus.BAD_REQUEST);
    }
  }
}
