
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,      // keep attributes
  attributeNamePrefix: '@_',    // prefix for attributes
  removeNSPrefix: true,         // remove saml: / samlp: prefixes
  trimValues: true,             // trim text values
});

function extractSamlFields(xml: string) {
  const obj = parser.parse(xml);
  const response = obj.Response;
  const assertion = response.Assertion;

  // Basic fields
  const destination = response['@_Destination'];
  const responseId = response['@_ID'];
  const assertionId = assertion?.['@_ID'];
  const issueInstant = response['@_IssueInstant'];
  const assertionIssueInstant = assertion?.['@_IssueInstant'];
  const issuerTop = response.Issuer;
  const issuerAssertion = assertion?.Issuer;
  const nameId = assertion?.Subject?.NameID;

  // SubjectConfirmationData
  const scd = assertion?.Subject?.SubjectConfirmation?.SubjectConfirmationData;
  const scdNotOnOrAfter = scd?.['@_NotOnOrAfter'];
  const scdRecipient = scd?.['@_Recipient'];

  // Conditions
  const condNotOnOrAfter = assertion?.Conditions?.['@_NotOnOrAfter'];
  const audience = assertion?.Conditions?.AudienceRestriction?.Audience;

  // Attributes
  const attrsRaw = assertion?.AttributeStatement?.Attribute;
  const attrsArray = Array.isArray(attrsRaw) ? attrsRaw : [attrsRaw];
  const attributes: Record<string, string> = {};
  for (const a of attrsArray) {
    if (a && a['@_Name']) attributes[a['@_Name']] = a.AttributeValue;
  }

  return {
    destination,
    responseId,
    assertionId,
    issueInstant,
    assertionIssueInstant,
    issuerTop,
    issuerAssertion,
    nameId,
    scdNotOnOrAfter,
    scdRecipient,
    condNotOnOrAfter,
    audience,
    attributes,
  };
}
export { extractSamlFields };