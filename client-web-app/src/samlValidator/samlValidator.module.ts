import { Module } from '@nestjs/common';
import { SamlValidatorController } from './samlValidator.controller';
import { SamlValidatorService } from './samlValidator.service';

@Module({
  controllers: [SamlValidatorController],
  providers: [SamlValidatorService],
  exports: [SamlValidatorService],
})
export class SamlValidatorModule {}
