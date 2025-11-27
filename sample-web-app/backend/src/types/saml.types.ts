export interface SamlResult {
  success: boolean;
  acsUrl: string;
  publicCertificate: string;
  xml: string; // Raw SAML response XML
}
