import * as fs from 'fs';
import * as path from 'path';
import * as xpath from 'xpath';
import xmlenc from 'xml-encryption';
import { SignedXml } from 'xml-crypto';
import {
  SamlValidationChecks,
  SamlAssertionAttributes,
  SamlValidationFailureResponse,
  SamlValidationSuccessResponse,
} from './types/samlValidator.types';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { SamlValidatorConfig } from './types/samlValidator.types';
import { Injectable, InternalServerErrorException } from '@nestjs/common';

const CLOCK_SKEW_MS = 5 * 60 * 1000;
const PRIVATE_KEY_PATH = '../../certs/private.key';
const PUBLIC_KEY_PATH = '../../certs/public.pem';

@Injectable()
export class SamlValidatorService {
  private readonly config: SamlValidatorConfig;
  private readonly privateKey: string;
  private readonly publicKey: string;

  constructor() {
    this.config = this.loadConfig();
    // Cache keys in memory
    const privateKeyFullPath = path.resolve(__dirname, PRIVATE_KEY_PATH);
    if (!fs.existsSync(privateKeyFullPath))
      throw new Error(`Private key file not found at: ${privateKeyFullPath}`);
    this.privateKey = fs.readFileSync(privateKeyFullPath, 'utf-8');
    const publicKeyFullPath = path.resolve(__dirname, PUBLIC_KEY_PATH);
    if (!fs.existsSync(publicKeyFullPath))
      throw new Error(`Public key file not found at: ${publicKeyFullPath}`);
    this.publicKey = fs.readFileSync(publicKeyFullPath, 'utf-8');
  }

  /** Load validator configuration (issuer, audience, clock skew) */
  private loadConfig(): SamlValidatorConfig {
    return {
      expectedAudience: undefined,
      expectedIssuer: 'Candescent',
      allowedClockSkewMs: CLOCK_SKEW_MS,
    };
  }

  /**
   * Validates a Base64-encoded SAMLResponse.
   * Returns detailed validation results, including individual checks and errors.
   */
  async validateSamlResponse(
    base64SamlResponse: string,
  ): Promise<SamlValidationSuccessResponse | SamlValidationFailureResponse> {
    const samlXml = Buffer.from(base64SamlResponse, 'base64').toString('utf-8');
    const doc = new DOMParser().parseFromString(samlXml, 'text/xml');
    if (!doc?.documentElement) {
      console.warn('Failed to parse SAMLResponse XML');
      return this.failure('Failed to parse SAMLResponse XML', this.initChecks(), 400);
    }
    const responseElement = doc.documentElement;
    const validationChecks = this.initChecks();
    if (responseElement.localName !== 'Response') {
      validationChecks.xmlStructure = false;
      return this.failure('Root element is not samlp:Response', validationChecks, 400);
    }
    const encryptedAssertionNode = this.selectNode(
      responseElement,
      "//*[local-name()='EncryptedAssertion']",
    );
    if (!encryptedAssertionNode) {
      return this.failure(
        '<saml:EncryptedAssertion> not found in SAMLResponse',
        validationChecks,
        400,
      );
    }
    validationChecks.encryptedAssertionPresent = true;
    console.log(
      `<saml:EncryptedAssertion> found: ${new XMLSerializer().serializeToString(encryptedAssertionNode)}`,
    );
    const encryptedDataNode = this.selectNode(
      encryptedAssertionNode,
      ".//*[local-name()='EncryptedData']",
    );
    if (!encryptedDataNode) {
      return this.failure(
        '<xenc:EncryptedData> not found inside <EncryptedAssertion>',
        validationChecks,
        400,
      );
    }
    const decryptedAssertionXml = await this.decryptAssertion(encryptedDataNode);
    validationChecks.decryptedAssertion = true;
    console.log(`Decrypted <saml:Assertion>: ${decryptedAssertionXml}`);
    const signatureValid = this.verifySignature(decryptedAssertionXml);
    if (signatureValid !== true) return this.failure(signatureValid, validationChecks, 400);
    validationChecks.signatureValid = true;
    const assertionDoc = new DOMParser().parseFromString(decryptedAssertionXml, 'text/xml');
    const assertionElement = assertionDoc.documentElement;
    if (!assertionElement || assertionElement.localName !== 'Response') {
      return this.failure('Decrypted XML is not a valid <saml:Assertion>', validationChecks, 400);
    }
    const assertionData = this.extractAssertionData(assertionElement);
    if (this.config.expectedIssuer && assertionData.issuer !== this.config.expectedIssuer) {
      return this.failure(
        `Issuer mismatch. Expected ${this.config.expectedIssuer}, got ${assertionData.issuer ?? 'N/A'}`,
        validationChecks,
        400,
      );
    }
    if (!assertionData.audience)
      return this.failure('Audience not found in Assertion Conditions', validationChecks, 400);
    else if (
      !this.config.expectedAudience ||
      assertionData.audience === this.config.expectedAudience
    )
      validationChecks.audienceValid = true;
    else
      return this.failure(
        `Audience mismatch. Expected ${this.config.expectedAudience}, got ${assertionData.audience}`,
        validationChecks,
        400,
      );
    const now = Date.now();
    if (!assertionData.issueInstant)
      return this.failure('IssueInstant not found on Assertion', validationChecks, 400);
    else {
      const issueInstantTime = Date.parse(assertionData.issueInstant);
      if (isNaN(issueInstantTime))
        return this.failure('Invalid IssueInstant timestamp on Assertion', validationChecks, 400);
      else if (now > issueInstantTime + this.config.allowedClockSkewMs)
        return this.failure('Assertion has expired (IssueInstant too old)', validationChecks, 400);
      else if (now + this.config.allowedClockSkewMs < issueInstantTime)
        return this.failure('Assertion IssueInstant is in the future', validationChecks, 400);
      else validationChecks.timestampsValid = true;
    }
    const requiredAttrs = ['firstName', 'lastName', 'email', 'memberId'];
    const missingAttrs = requiredAttrs.filter((name) => !assertionData.attributes[name]);
    if (!assertionData.subjectNameId)
      return this.failure('Subject NameID is missing from Assertion', validationChecks, 400);
    if (missingAttrs.length > 0)
      return this.failure(
        `Missing required attributes: ${missingAttrs.join(', ')}`,
        validationChecks,
        400,
      );
    return assertionData;
  }

  /** Helper to select single XML node with casting */
  private selectNode(node: Node, xpathExpr: string): Element | undefined {
    return xpath.select1(xpathExpr, node) as Element | undefined;
  }

  /** Initialize all validation checks to false */
  private initChecks(): SamlValidationChecks {
    return {
      xmlStructure: false,
      encryptedAssertionPresent: false,
      decryptedAssertion: false,
      signatureValid: false,
      audienceValid: false,
      timestampsValid: false,
      assertionContentValid: false,
    };
  }

  /** Decrypts <xenc:EncryptedData> using cached private key */
  private async decryptAssertion(encryptedDataNode: Element): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      xmlenc.decrypt(
        new XMLSerializer().serializeToString(encryptedDataNode),
        { key: this.privateKey },
        (err, result) => {
          if (err) return reject(err);
          if (!result) return reject(new Error('xml-encryption returned empty output.'));
          resolve(result);
        },
      );
    });
  }

  /** Verifies signature using cached public key and adds errors if invalid */
  private verifySignature(assertionXml: string): string | true {
    try {
      const doc = new DOMParser().parseFromString(assertionXml, 'text/xml');
      const signatureNode = this.selectNode(doc, "//*[local-name()='Signature']");
      if (!signatureNode) return 'Signature element not found in Assertion';
      const sig = new SignedXml() as any;
      sig.keyInfoProvider = { getKeyInfo: () => null, getKey: () => this.publicKey };
      sig.publicCert = this.publicKey;
      sig.loadSignature(signatureNode);
      if (!sig.checkSignature(assertionXml))
        return `Signature verification failed: ${sig.validationErrors?.join(', ')}`;
      return true;
    } catch (err) {
      return `Signature verification error: ${(err as Error).message}`;
    }
  }

  /** Extracts subject, audience, timestamps, and attributes from decrypted Assertion */
  private extractAssertionData(assertionElement: Element): SamlValidationSuccessResponse {
    const select = xpath.select;
    const getText = (node: Node | undefined | null) => node?.firstChild?.nodeValue ?? undefined;
    const issuerNode = select(".//*[local-name()='Issuer']", assertionElement)[0] as
      | Element
      | undefined;
    const subjectNameIdNode = select(
      ".//*[local-name()='Subject']/*[local-name()='NameID']",
      assertionElement,
    )[0] as Element | undefined;
    const audienceNode = select(
      ".//*[local-name()='AudienceRestriction']/*[local-name()='Audience']",
      assertionElement,
    )[0] as Element | undefined;
    const issueInstant = assertionElement.getAttribute('IssueInstant') ?? undefined;
    const attributeNodes = select(".//*[local-name()='Attribute']", assertionElement) as Element[];
    const attributes: SamlAssertionAttributes = attributeNodes.reduce((acc, attrNode) => {
      const name = attrNode.getAttribute('Name');
      const valueNode = select(".//*[local-name()='AttributeValue']", attrNode)[0] as
        | Element
        | undefined;
      const value = getText(valueNode);
      if (name && value) acc[name] = value;
      return acc;
    }, {} as SamlAssertionAttributes);
    return {
      issuer: getText(issuerNode),
      subjectNameId: getText(subjectNameIdNode),
      audience: getText(audienceNode),
      issueInstant,
      attributes,
    };
  }

  /** Helper method to construct a failure response with status code */
  private failure(
    message: string,
    checks: SamlValidationChecks,
    status = 400,
  ): SamlValidationFailureResponse {
    throw { message, checks, status };
  }
}
