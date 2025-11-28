import { BadRequestException, Controller, Post, Query } from '@nestjs/common';
import { AuthValidatorService } from './authValidator.service';

@Controller('auth-validator')
export class AuthValidatorController {
  constructor(private readonly authValidatorService: AuthValidatorService) {}


  /**
   * Assertion Consumer Service (ACS) endpoint.
   * Receives Base64-encoded SAMLResponse (and optional RelayState) via query
   * parameters and validates it.
   */
  @Post('acs')
  async acs(
    @ Query('SAMLResponse') samlResponseQuery?: string,
    @Query('RelayState') relayStateQuery?: string,
  ): Promise<any> {
    if (!samlResponseQuery) {
      throw new BadRequestException('Missing SAMLResponse parameter');
    }
 
    const validationResult = await this.authValidatorService.validateSamlResponse(
      samlResponseQuery,
      relayStateQuery,
    );
 
    const assertion = validationResult.assertion;
 
    return {
     // status: 201,
     // success: validationResult.ok,
      issuer: assertion?.issuer ?? null,
      audience: assertion?.audience ?? null,
      timestamps: assertion?.issueInstant ?? null,
    };
  }
}
