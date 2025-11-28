import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { AppController } from './app.controller';
import { SamlValidatorModule } from './samlValidator/samlValidator.module';

@Module({
  imports: [SamlValidatorModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
