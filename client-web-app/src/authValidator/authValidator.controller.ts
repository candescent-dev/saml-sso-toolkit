import { Controller, Post } from '@nestjs/common';
import { AuthValidatorService } from './authValidator.service';

@Controller('auth-validator')
export class AuthValidatorController {
  constructor(private readonly authValidatorService: AuthValidatorService) {}

  @Post('test')
  testRoute() {
    // return this.authValidatorService.test();
    return {
      status: 'ok',
      message: 'Hello',
      timestamp: new Date().toISOString(),
    };
  }
}
