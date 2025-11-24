import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './appConfig/appConfig.module';
import { SimulationModule } from './simulation/simulation.module';
@Module({
  imports: [AppConfigModule, SimulationModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
