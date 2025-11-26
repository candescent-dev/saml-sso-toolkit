import { Injectable } from '@nestjs/common';
@Injectable()
export class AuthValidatorService {
  constructor() {}

  test(): boolean {
    return true;
  }
}
