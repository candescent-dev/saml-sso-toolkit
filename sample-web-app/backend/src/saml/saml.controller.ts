import { SamlService } from './saml.service';
import { SamlResult } from './types/saml.types';
import { SamlRequestDto } from './dto/samlRequest.dto';
import { AuthSettingData } from './types/authSetting.types';
import { Controller, Get, Post, Body, HttpException, HttpStatus } from '@nestjs/common';

/**
 * Controller responsible for handling saml-related routes.
 */
@Controller('saml')
export class SamlController {
  constructor(private readonly samlService: SamlService) {}

  /**
   * POST /saml
   * Accepts saml request from frontend and delegates processing to service.
   * @param samlRequestDto - validated request body with ACS URL, encryption key, and attributes
   * @returns success response with saml result or throws HttpException on error
   */
  @Post("login")
  async processSamlRequest(@Body() samlRequestDto: SamlRequestDto): Promise<SamlResult> {
    console.log('Received saml request', samlRequestDto);
    try {
      // Call service to process the SAML request
      const response: SamlResult =
        await this.samlService.generateAndSendSamlResponse(samlRequestDto);
      // Storeing saml settings in both cache and cache.json file
      await this.samlService.saveAuthSetting(samlRequestDto.acsUrl);
      return response;
    } catch (error: any) {
      const message = error.message || 'SAML failed';
      const status = error.status || HttpStatus.BAD_REQUEST;
      throw new HttpException({ success: false, message }, status);
    }
  }

  /**
   * GET /saml/saml-setting — Retrieve saml setting from cache.json file
   * @returns The cached saml setting or a message if none exist or expired
   */
  @Get('saml-setting')
  public async getAuthSetting(): Promise<{
    message: string;
    authSetting?: AuthSettingData;
  }> {
    const authSetting = await this.samlService.getAuthSettingFromCache();
    if (!authSetting) {
      return { message: 'No saml setting found or they have expired' };
    }
    return {
      message: 'Saml setting retrieved from cache',
      authSetting,
    };
  }
}
