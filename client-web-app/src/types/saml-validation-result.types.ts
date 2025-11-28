import { SamlValidationChecks } from './saml-validation-checks.types';
import { SamlAssertionData } from './saml-assertion-data.types';

export interface SamlValidationResult {
  checks: SamlValidationChecks;
  errors: string[];
  assertion?: SamlAssertionData;
}


