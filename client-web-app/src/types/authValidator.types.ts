export interface AuthValidatorConfig {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  redirectUrl: string;
  state?: string;
}

export interface AuthorizePayload {
  client_id: string;
  redirect_uri: string;
  response_type: string;
  scope: string;
  state?: string;
}

export interface TokenResponse {
  id_token: string;
  token_type: string;
  expires_in: number;
  access_token: string;
}

export interface JWKKeys {
  kty: 'RSA';
  kid: string;
  n: string;
  e: string;
}
