import * as fs from 'fs';
import * as path from 'path';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import xmlenc from 'xml-encryption';
import { SignedXml } from 'xml-crypto';
import * as xpath from 'xpath';
import { Logger } from '@nestjs/common';

const logger = new Logger('SAMLService');

interface SamlAssertionAttributes {
  [name: string]: string;
}

interface SamlAssertionData {
  issuer?: string;
  subjectNameId?: string;
  audience?: string;
  notOnOrAfter?: string;
  attributes: SamlAssertionAttributes;
}

interface SamlValidationChecks {
  xmlStructure: boolean;
  encryptedAssertionPresent: boolean;
  decryptedAssertion: boolean;
  signatureValid: boolean;
  destinationValid: boolean;
  audienceValid: boolean;
  timestampsValid: boolean;
  assertionContentValid: boolean;
}

interface SamlValidationResult {
  checks: SamlValidationChecks;
  errors: string[];
  assertion?: SamlAssertionData;
}

interface AuthValidatorConfig {
  readonly acsUrl: string;
  readonly expectedAudience?: string;
  readonly expectedIssuer?: string;
  readonly allowedClockSkewMs: number;
  readonly privateKeyPath: string;
  readonly simulatorPublicCertPath: string;
}

const CONFIG_PATH = '../authValidatorConfig/config.json';
const DEFAULT_ACS_URL = 'http://localhost:7000/api/auth-validator/acs';
const DEFAULT_CLOCK_SKEW_MS = 5 * 60 * 1000;
const DEFAULT_PRIVATE_KEY_PATH = '../../certs/private.key';
const DEFAULT_SIMULATOR_CERT_PATH = '../../certs/public.pem';

@Injectable()
export class AuthValidatorService {
  private readonly config: AuthValidatorConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Main entry: validates incoming Base64-encoded SAMLResponse.
   */
  async validateSamlResponse(
    base64SamlResponse: string,
    relayState?: string,
  ): Promise<SamlValidationResult> {
    try {
      const samlXml = Buffer.from(base64SamlResponse, 'base64').toString('utf-8');
      const doc = new DOMParser().parseFromString(samlXml, 'text/xml');

      // Log the document element name
  if (doc && doc.documentElement) {
        const serializedDoc = new XMLSerializer().serializeToString(doc);
        logger.log(`Parsed SAML Document: ${serializedDoc}`);
        logger.log(`Root element: ${doc.documentElement.nodeName}`);
      } else {
        logger.warn('Failed to parse SAMLResponse XML');
      }


      if (!doc || !doc.documentElement) {
        return this.failure(['Failed to parse SAMLResponse XML'], {
          xmlStructure: false,
          encryptedAssertionPresent: false,
          decryptedAssertion: false,
          signatureValid: false,
          destinationValid: false,
          audienceValid: false,
          timestampsValid: false,
          assertionContentValid: false,
        });
      }

      const checks: SamlValidationChecks = {
        xmlStructure: true,
        encryptedAssertionPresent: false,
        decryptedAssertion: false,
        signatureValid: false,
        destinationValid: false,
        audienceValid: false,
        timestampsValid: false,
        assertionContentValid: false,
      };
      const errors: string[] = [];

      const responseElement = doc.documentElement;
      if (responseElement.localName !== 'Response') {
        checks.xmlStructure = false;
        errors.push('Root element is not samlp:Response');
      }

      // Destination validation
      const destinationAttr = responseElement.getAttribute('Destination');
      if (!destinationAttr) {
        errors.push('Missing Destination on SAML Response');
      } else if (!this.urlsEqual(destinationAttr, this.config.acsUrl)) {
        errors.push(
          `Destination mismatch. Expected ${this.config.acsUrl}, got ${destinationAttr}`,
        );
      } else {
        checks.destinationValid = true;
      }

     // Find EncryptedAssertion
      const encryptedAssertionNode = xpath.select1(
        "//*[local-name()='EncryptedAssertion']",
        responseElement,
      ) as Element | undefined | null;
 
      if (!encryptedAssertionNode) {
        errors.push('<saml:EncryptedAssertion> not found in SAMLResponse');
      } else {
        const encryptedAssertionXml = new XMLSerializer().serializeToString(
          encryptedAssertionNode,
        );
        logger.log(`<saml:EncryptedAssertion> found: ${encryptedAssertionXml}`);
        checks.encryptedAssertionPresent = true;
      }
 
      if (!encryptedAssertionNode) {
        return this.failure(errors, checks);
      }
 
      // Extract <xenc:EncryptedData> and decrypt with our private key
      const encryptedDataNode = xpath.select1(
        ".//*[local-name()='EncryptedData']",
        encryptedAssertionNode,
      ) as Element | undefined | null;
 
      if (!encryptedDataNode) {
        errors.push('<xenc:EncryptedData> not found inside <EncryptedAssertion>');
        return this.failure(errors, checks);
      }
 
      const encryptedDataXml = new XMLSerializer().serializeToString(encryptedDataNode);
      const decryptedAssertionXml = await this.decryptAssertion(encryptedDataXml);
      checks.decryptedAssertion = true;
 
      logger.log(`Decrypted <saml:Assertion>: ${decryptedAssertionXml}`);
 
      // Parse decrypted assertion
      const assertionDoc = new DOMParser().parseFromString(
        decryptedAssertionXml,
        'text/xml',
      );
      const assertionElement = assertionDoc.documentElement;
      if (!assertionElement || assertionElement.localName !== 'Response') {
        errors.push('Decrypted XML is not a valid <saml:Assertion>');
        return this.failure(errors, checks);
      }
      
      // Extract assertion data
      const assertionData = this.extractAssertionData(assertionElement);

      // Issuer validation (optional, based on config)
      if (this.config.expectedIssuer) {
        if (assertionData.issuer !== this.config.expectedIssuer) {
          errors.push(
            `Issuer mismatch. Expected ${this.config.expectedIssuer}, got ${
              assertionData.issuer ?? 'N/A'
            }`,
          );
        }
      }

      // Audience validation
      if (assertionData.audience) {
        if (
          this.config.expectedAudience &&
          assertionData.audience !== this.config.expectedAudience
        ) {
          errors.push(
            `Audience mismatch. Expected ${this.config.expectedAudience}, got ${assertionData.audience}`,
          );
        } else {
          checks.audienceValid = true;
        }
      } else {
        errors.push('Audience not found in Assertion Conditions');
      }

      // Timestamp validation (NotOnOrAfter)
      const now = Date.now();
      if (!assertionData.notOnOrAfter) {
        errors.push('NotOnOrAfter not found in Assertion');
      } else {
        const notOnOrAfterTime = Date.parse(assertionData.notOnOrAfter);
        if (Number.isNaN(notOnOrAfterTime)) {
          errors.push('Invalid NotOnOrAfter timestamp on Assertion');
        } else if (now > notOnOrAfterTime + this.config.allowedClockSkewMs) {
          errors.push('Assertion has expired (NotOnOrAfter in the past)');
        } else {
          checks.timestampsValid = true;
        }
      }

      // Content validation – ensure key attributes and subject are present
      const requiredAttrs = ['firstName', 'lastName', 'email', 'memberId'];
      const missingAttrs = requiredAttrs.filter(
        (name) => !assertionData.attributes[name],
      );
      if (!assertionData.subjectNameId) {
        errors.push('Subject NameID is missing from Assertion');
      }
      if (missingAttrs.length > 0) {
        errors.push(`Missing required attributes: ${missingAttrs.join(', ')}`);
      } else if (assertionData.subjectNameId) {
        checks.assertionContentValid = true;
      }

      // Optional: if RelayState contains expected attributes, we could compare them here.
      if (relayState) {
        try {
          const parsedState = JSON.parse(relayState) as {
            attributes?: Record<string, string>;
          };
          if (parsedState.attributes) {
            const mismatched: string[] = [];
            for (const [key, expectedValue] of Object.entries(parsedState.attributes)) {
              const actual = assertionData.attributes[key];
              if (actual !== expectedValue) {
                mismatched.push(`${key} (expected=${expectedValue}, actual=${actual ?? 'N/A'})`);
              }
            }
            if (mismatched.length > 0) {
              errors.push(
                `Assertion attributes do not match RelayState: ${mismatched.join('; ')}`,
              );
            }
          }
        } catch {
          // Ignore malformed RelayState – do not fail whole validation.
        }
      }

      const ok =
        checks.xmlStructure &&
        checks.encryptedAssertionPresent &&
        checks.decryptedAssertion &&
        checks.signatureValid &&
        checks.destinationValid &&
        checks.audienceValid &&
        checks.timestampsValid &&
        checks.assertionContentValid &&
        errors.length === 0;

      return {
        checks,
        errors,
        assertion: assertionData,
      };
    } catch (error) {
      // Unexpected errors surface as 500 to the caller, but we also
      // keep the method signature stable.
      throw new InternalServerErrorException(
        `Failed to validate SAMLResponse: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Load validator configuration
   */
  private loadConfig(): AuthValidatorConfig {
    return {
    acsUrl: DEFAULT_ACS_URL,
    expectedAudience: undefined,
    expectedIssuer: 'Candescent',
    allowedClockSkewMs: DEFAULT_CLOCK_SKEW_MS,
    privateKeyPath: DEFAULT_PRIVATE_KEY_PATH,      
    simulatorPublicCertPath: DEFAULT_SIMULATOR_CERT_PATH,
  };
  }

  /**
   * Decrypts the <xenc:EncryptedData> block using the configured private key.
   * Successful decryption implies the assertion was encrypted with our public certificate.
   */
  private async decryptAssertion(encryptedDataXml: string): Promise<string> {
    const privateKeyFullPath = path.resolve(__dirname, this.config.privateKeyPath);
    if (!fs.existsSync(privateKeyFullPath)) {
      throw new Error(`Private key file not found at: ${privateKeyFullPath}`);
    }
    const privateKey = fs.readFileSync(privateKeyFullPath, 'utf-8');

    return await new Promise<string>((resolve, reject) => {
      xmlenc.decrypt(encryptedDataXml, { key: privateKey }, (err, result) => {
        if (err) return reject(err);
        if (!result) return reject(new Error('xml-encryption returned empty output.'));
        resolve(result);
      });
    });
  }

  /**
   * Extracts subject, audience, timestamps, and attributes from a decrypted Assertion.
   */
  private extractAssertionData(assertionElement: Element): SamlAssertionData {
    const select = xpath.select;
    const getText = (node: Node | undefined | null): string | undefined =>
      node && node.firstChild ? node.firstChild.nodeValue ?? undefined : undefined;

    const issuerNode = select(
      ".//*[local-name()='Issuer']",
      assertionElement,
    )[0] as Element | undefined;
    const subjectNameIdNode = select(
      ".//*[local-name()='Subject']/*[local-name()='NameID']",
      assertionElement,
    )[0] as Element | undefined;
    const audienceNode = select(
      ".//*[local-name()='AudienceRestriction']/*[local-name()='Audience']",
      assertionElement,
    )[0] as Element | undefined;

    const notOnOrAfterNode = select(
      ".//*[local-name()='SubjectConfirmationData' or local-name()='Conditions']",
      assertionElement,
    )[0] as Element | undefined;
    const notOnOrAfter =
      notOnOrAfterNode?.getAttribute('NotOnOrAfter') ?? undefined;

    const attributeNodes = select(
      ".//*[local-name()='Attribute']",
      assertionElement,
    ) as Element[];

    const attributes: SamlAssertionAttributes = {};
    for (const attrNode of attributeNodes) {
      const name = attrNode.getAttribute('Name');
      if (!name) continue;
      const valueNode = select(
        ".//*[local-name()='AttributeValue']",
        attrNode,
      )[0] as Element | undefined;
      const value = getText(valueNode);
      if (typeof value === 'string') {
        attributes[name] = value;
      }
    }

    return {
      issuer: getText(issuerNode),
      subjectNameId: getText(subjectNameIdNode),
      audience: getText(audienceNode),
      notOnOrAfter,
      attributes,
    };
  }

  /**
   * Utility to normalise and compare URLs for Destination/ACS validation.
   */
  private urlsEqual(a: string, b: string): boolean {
    const normalise = (url: string) => url.replace(/\/+$/, '');
    return normalise(a) === normalise(b);
  }

  private failure(
    errors: string[],
    checks: SamlValidationChecks,
  ): SamlValidationResult {
    return {
      checks,
      errors,
    };
  }
}
