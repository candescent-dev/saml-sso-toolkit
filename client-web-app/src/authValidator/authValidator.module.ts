import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AuthValidatorController } from './authValidator.controller';
import { AuthValidatorService } from './authValidator.service';

@Module({
  imports: [HttpModule],
  controllers: [AuthValidatorController],
  providers: [AuthValidatorService],
  exports: [AuthValidatorService],
})
export class AuthValidatorModule {}
