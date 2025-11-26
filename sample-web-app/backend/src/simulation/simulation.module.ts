import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SimulationController } from './simulation.controller';
import { SimulationService } from './simulation.service';

@Module({
   imports: [HttpModule],
  controllers: [SimulationController],
  providers: [SimulationService]
})
export class SimulationModule {}
