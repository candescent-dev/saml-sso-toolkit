import { Controller, Get } from '@nestjs/common';
import { AuthValidatorService } from './authValidator.service';

@Controller('auth-validator')
export class AuthValidatorController {
  constructor(private readonly authValidatorService: AuthValidatorService) {}

  @Get('test')
  testRoute() {
    return this.authValidatorService.test();
  }
}
