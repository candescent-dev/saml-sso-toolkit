import { Controller, Get } from '@nestjs/common';
import { AuthValidatorService } from './authValidator.service';
import { AuthValidatorConfig, AuthorizePayload, TokenResponse } from '../types/authValidator.types';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';

/** Return type: either TokenResponse on success, or raw external API error */
type AuthorizeAndTokenResult = TokenResponse | Record<string, unknown>;
const issuer = 'https://www.digitalinsight.com';

@Controller('auth-validator')
export class AuthValidatorController {
  private readonly configPath = path.resolve('src/authValidatorConfig/config.json');
  private config: AuthValidatorConfig;
  private tokenApiResponse: TokenResponse | null = null;

  constructor(private readonly authValidatorService: AuthValidatorService) {}

  /** Load config from file */
  private loadAuthValidatorConfig(): AuthValidatorConfig {
    if (!this.config) {
      if (!fs.existsSync(this.configPath)) {
        throw new Error('AuthValidatorConfig file not found');
      }
      const file = fs.readFileSync(this.configPath, 'utf8');
      this.config = JSON.parse(file) as AuthValidatorConfig;
    }
    return this.config;
  }

  /** Save config to file */
  private saveAuthValidatorConfig(): void {
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
  }

  /** Combined endpoint: calls authorize and then exchangeToken */
  @Get('call-authorize-and-token')
  async authorizeAndExchangeToken(): Promise<AuthorizeAndTokenResult> {
    try {
      console.log('------- [Auth Validator] Loading auth validator config ------');
      const config = this.loadAuthValidatorConfig();
      // Build authorize payload
      console.log('[Auth Validator] Building payload for /authorize call');
      const payload: AuthorizePayload = {
        client_id: config.client_id,
        redirect_uri: config.redirect_uri,
        response_type: 'code',
        scope: 'openid',
      };
      //  Generate State
      console.log('[Auth Validator] generating random state for "/authorize" endpoint');
      const state = this.authValidatorService.generateState();
      payload.state = state;
      //  Call authorize Api
      console.log('[Auth Validator] Making a call to "/authorize" endpoint');
      const authorizeResult = await this.authValidatorService.authorizeClient(payload);
      if (!authorizeResult.success) {
        console.error('[Auth Validator] /authorize failed:', authorizeResult.error);
        return authorizeResult.error;
      }
      const redirectUrl = authorizeResult.data.redirectUrl;
      console.log('[Auth Validator] /authorize succeeded, redirectUrl received -', redirectUrl);
      // Extract auth code
      const parsedUrl = new url.URL(redirectUrl);
      const authCode = parsedUrl.searchParams.get('code');
      const returnedState = parsedUrl.searchParams.get('state');
      console.log(
        '[Auth Validator] Parsing redirect URL to extract authorization code -',
        authCode,
      );
      if (!authCode) {
        console.error('[Auth Validator] Missing authorization code in redirectUrl');
        return { message: '"/authorize" - Missing authorization code in redirectUrl' };
      }
      if (state && returnedState !== state) {
        console.error('[Auth Validator] State mismatch – CSRF validation failed');
        return { message: 'State mismatch – CSRF validation failed' };
      }
      // Update config file
      console.log('[Auth Validator] Updating config with redirectUrl');
      config.redirectUrl = redirectUrl;
      this.saveAuthValidatorConfig();
      // Call token Api
      console.log('[Auth Validator] Making a call to "/token" endpoint');
      const tokenResult = await this.authValidatorService.exchangeToken(
        config.client_id,
        config.client_secret,
        authCode,
      );
      if (!tokenResult.success) {
        console.error('[Auth Validator] /token failed:', tokenResult.error);
        return tokenResult.error;
      }
      // Store token response for later use
      console.log('[Auth Validator] /token succeeded, storing token response');
      this.tokenApiResponse = tokenResult.data;
      // Return token response
      console.log('[Auth Validator] Returning token result');
      return tokenResult.data;
    } catch (err: unknown) {
      console.error('[Auth Validator] Error during authorizeAndExchangeToken:', err);
      if (err instanceof Error) {
        return { message: err.message };
      }
      return { error: err };
    }
  }

  /** Endpoint to validate stored id_token */
  @Get('validate-id-token')
  async validateLastIdToken() {
    console.log('------- [Auth Validator] Starting ID token validation -------');
    if (!this.tokenApiResponse?.id_token) {
      console.error(
        '[Auth Validator] No id_token found. Must call /call-authorize-and-token first',
      );
      return {
        isValid: false,
        error: 'id_token not found. Call "/call-authorize-and-token" endpoint first',
      };
    }
    console.log('[Auth Validator] Loading auth validator config');
    const config = this.loadAuthValidatorConfig();
    try {
      console.log('[Auth Validator] Validating ID token');
      const payload = await this.authValidatorService.validateIdToken(
        this.tokenApiResponse.id_token,
        issuer,
        config.client_id,
      );
      console.log('[Auth Validator] ID token is valid');
      return { isValid: true, payload };
    } catch (err: any) {
      console.error('[Auth Validator] ID token validation failed:', err.message);
      return { isValid: false, error: err.message };
    }
  }
}
