export interface SamlResult {
  success: boolean;
  xml: string; // Raw SAML response XML
  base64: string; // Base64-encoded SAML response
  acsServerResponse: any; // Response from the ACS endpoint
}
