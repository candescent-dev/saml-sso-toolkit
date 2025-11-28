export interface SamlValidatorConfig {
  readonly acsUrl: string;
  readonly expectedAudience?: string;
  readonly expectedIssuer?: string;
  readonly allowedClockSkewMs: number;
  readonly privateKeyPath: string;
  readonly simulatorPublicCertPath: string;
}

export interface SamlAssertionAttributes {
  [name: string]: string;
}

export interface SamlValidationChecks {
  xmlStructure: boolean;
  encryptedAssertionPresent: boolean;
  decryptedAssertion: boolean;
  signatureValid: boolean;
  destinationValid: boolean;
  audienceValid: boolean;
  timestampsValid: boolean;
  assertionContentValid: boolean;
}

export interface SamlValidationResult {
  checks: SamlValidationChecks;
  errors: string[];
  assertion?: SamlAssertionData;
}

export interface SamlAssertionData {
  issuer?: string;
  subjectNameId?: string;
  audience?: string;
  issueInstant?: string;
  attributes: SamlAssertionAttributes;
}
