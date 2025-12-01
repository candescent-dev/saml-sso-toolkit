export interface SamlValidatorConfig {
  readonly expectedAudience?: string;
  readonly expectedIssuer?: string;
  readonly allowedClockSkewMs: number;
}

export interface SamlAssertionAttributes {
  [name: string]: string;
}

export interface SamlValidationChecks {
  xmlStructure: boolean;
  encryptedAssertionPresent: boolean;
  decryptedAssertion: boolean;
  signatureValid: boolean;
  audienceValid: boolean;
  timestampsValid: boolean;
  assertionContentValid: boolean;
}

export interface SamlValidationFailureResponse {
  message: string;
  status: number;
  checks?: SamlValidationChecks;
}

export interface SamlValidationSuccessResponse {
  issuer?: string;
  subjectNameId?: string;
  audience?: string;
  issueInstant?: string;
  attributes: SamlAssertionAttributes;
}
