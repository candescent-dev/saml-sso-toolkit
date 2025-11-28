import { SamlAssertionAttributes } from './saml-assertion-attributes.types';

export interface SamlAssertionData {
  issuer?: string;
  subjectNameId?: string;
  audience?: string;
  notOnOrAfter?: string;
  attributes: SamlAssertionAttributes;
}


