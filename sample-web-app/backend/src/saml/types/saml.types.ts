export interface SamlResult {
  success: boolean;
  acsUrl: string;
  publicCertificate: string;
  xml: string; // Raw SAML response XML
}

export interface ACSServerResponse<T> {
  status: number;
  data: T;
}

export interface ACSServerData {
  issuer: string;
  audience: string;
  timestamps: string;
}