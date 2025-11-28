import { SamlAssertionAttributes } from './saml-assertion-attributes.types';

export interface SamlAssertionData {
  issuer?: string;
  subjectNameId?: string;
  audience?: string;
  issueInstant?: string;
  attributes: SamlAssertionAttributes;
}


