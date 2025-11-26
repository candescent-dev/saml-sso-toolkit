import { IsString, IsNotEmpty, IsIn, IsUrl, IsOptional } from 'class-validator';

export class AuthorizeDto {
  // Client ID issued to the application
  @IsString()
  @IsNotEmpty()
  client_id: string;

  // Response type must be 'code' for Authorization Code flow
  @IsString()
  @IsNotEmpty()
  @IsIn(['code'], {
    message: 'Unsupported response_type, response_type must be "code"',
  })
  response_type: string;

  // Scope must include 'openid' for OpenID Connect
  @IsString()
  @IsNotEmpty()
  @IsIn(['openid'], {
    message: 'Unsupported scope, scope must be "openid"',
  })
  scope: string;

  // URL to redirect the client after authorization
  @IsString()
  @IsNotEmpty()
  @IsUrl({
    require_protocol: true, // must have http/https
    require_tld: false, // allow localhost
  })
  redirect_uri: string;

  /**
   * Optional
   * State to prevent CSRF and maintain request context
   */
  @IsString()
  @IsOptional()
  state?: string;
}
