import { BadRequestException, Controller, Post, Query } from '@nestjs/common';
import { SamlValidatorService } from './samlValidator.service';

@Controller('saml-validator')
export class SamlValidatorController {
  constructor(private readonly samlValidatorService: SamlValidatorService) {}

  /**
   * Assertion Consumer Service (ACS) endpoint.
   * Receives Base64-encoded SAMLResponse (and optional RelayState) via query
   * parameters and validates it.
   */
  @Post('acs')
  async acs(
    @Query('SAMLResponse') samlResponseQuery?: string,
    @Query('RelayState') relayStateQuery?: string,
  ): Promise<any> {
    if (!samlResponseQuery) {
      throw new BadRequestException('Missing SAMLResponse parameter');
    }
    const validationResult = await this.samlValidatorService.validateSamlResponse(
      samlResponseQuery,
      relayStateQuery,
    );
    const assertion = validationResult.assertion;
    return {
      issuer: assertion?.issuer ?? null,
      audience: assertion?.audience ?? null,
      timestamps: assertion?.issueInstant ?? null,
    };
  }
}
