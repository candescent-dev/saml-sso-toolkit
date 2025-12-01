import { Controller, Post, Query, HttpException, HttpStatus } from '@nestjs/common';
import { SamlValidatorService } from './samlValidator.service';
import { SamlQueryDto } from './dto/samlResponse.dto';
import {
  SamlValidationSuccessResponse,
  SamlValidationFailureResponse,
} from './types/samlValidator.types';

@Controller('saml-validator')
export class SamlValidatorController {
  constructor(private readonly samlValidatorService: SamlValidatorService) {}

  /**
   * Assertion Consumer Service (ACS) endpoint
   * Validates Base64-encoded SAMLResponse and returns assertion data
   * @param samlQueryDto - Query DTO containing SAMLResponse
   * @return Object containing issuer, audience, timestamps, and assertion data
   * @throws HttpException on validation errors or unexpected issues
   */
  @Post('acs')
  async acs(
    @Query() samlQueryDto: SamlQueryDto,
  ): Promise<SamlValidationSuccessResponse | SamlValidationFailureResponse> {
    const { SAMLResponse } = samlQueryDto;
    try {
      const response: SamlValidationSuccessResponse | SamlValidationFailureResponse =
        await this.samlValidatorService.validateSamlResponse(SAMLResponse);
      return response;
    } catch (error: unknown) {
      // Service threw a structured error with 'message' and 'status'
      if (error && typeof error === 'object' && 'message' in error && 'status' in error) {
        const errObj = error as { message: string; status: number };
        throw new HttpException({ message: errObj.message }, errObj.status);
      }
      // Fallback for unexpected errors
      throw new HttpException(
        { message: (error as Error).message || 'Unexpected server error' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
