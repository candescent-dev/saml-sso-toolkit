import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { SamlService } from './saml.service';
import { SamlRequestDto } from './dto/samlRequest.dto';
import { SamlResult } from './types/saml.types';

/**
 * Controller responsible for handling saml-related routes.
 */
@Controller('saml/login')
export class SamlController {
  constructor(private readonly samlService: SamlService) {}

  /**
   * POST /saml
   * Accepts saml request from frontend and delegates processing to service.
   * @param samlRequestDto - validated request body with ACS URL, encryption key, and attributes
   * @returns success response with saml result or throws HttpException on error
   */
  @Post()
  public async processSamlRequest(@Body() samlRequestDto: SamlRequestDto): Promise<SamlResult> {
    console.log('Received saml request', samlRequestDto);
    try {
      // Call service to process the SAML request
      const response: SamlResult =
        await this.samlService.generateAndSendSamlResponse(samlRequestDto);
      return response;
    } catch (error: any) {
      const message = error.message || 'SAML failed';
      const status = error.status || HttpStatus.BAD_REQUEST;
      throw new HttpException({ success: false, message }, status);
    }
  }
}
