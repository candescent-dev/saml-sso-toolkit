import { Module } from '@nestjs/common';
import { AuthValidatorController } from './authValidator.controller';
import { AuthValidatorService } from './authValidator.service';

@Module({
  controllers: [AuthValidatorController],
  providers: [AuthValidatorService],
  exports: [AuthValidatorService],
})
export class AuthValidatorModule {}
