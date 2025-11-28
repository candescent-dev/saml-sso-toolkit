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


