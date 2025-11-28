import * as fs from 'fs';
import * as path from 'path';
import { create } from 'xmlbuilder2';
import xmlenc from 'xml-encryption';
import { SignedXml } from 'xml-crypto';
import { X509Certificate } from 'crypto';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { SamlResult } from '../types/saml.types';
import { SamlRequestDto } from './dto/samlRequest.dto';
import type { XMLBuilder } from 'xmlbuilder2/lib/interfaces';

const PRIVATE_KEY_PATH: string = '../../certs/private.pem';
const SAML_ISSUER: string = 'Candescent';
const TIMEOUT: number = 5000;
/**
 * Represents the separated SAML components.
 */
interface BuiltSamlParts {
  readonly samlResponseXml: string;
  readonly assertionXml: string;
}

@Injectable()
export class SamlService {
  constructor(private readonly httpService: HttpService) {}

  /**
   * Orchestrates the SAML response workflow
   * @param samlRequestDto - validated saml request
   * @returns final SAML response and metadata
   * @throws Error if SAML construction, signing, or encryption fails
   */
  public async generateAndSendSamlResponse(samlRequestDto: SamlRequestDto): Promise<SamlResult> {
    // Step 1: Generate Base SAML Assertion
    const { samlResponseXml, assertionXml } = this.buildSamlAssertionResponse(samlRequestDto);
    console.log('samlResponseXml:', samlResponseXml);
    console.log('assertionXml:', assertionXml);
    // Step 2: Sign the raw assertion with Candescent private key
    const signedAssertionXml = this.signAssertion(assertionXml, samlRequestDto.publicCertificate);
    // Step 3: Encrypt the signed assertion using vendor's public certificate
    const encryptedAssertionXml = await this.encryptAssertion(
      signedAssertionXml,
      samlRequestDto.publicCertificate,
    );
    console.log('encryptedAssertionXml', encryptedAssertionXml);
    // Step 4: Inject encrypted assertion back into the response
    const finalSamlResponse = this.replaceAssertionWithEncrypted(
      samlResponseXml,
      encryptedAssertionXml,
    );
    console.log('finalSamlResponse', finalSamlResponse);
    // STEP 5: Base64-encode SAML Response
    const base64SamlResponse = Buffer.from(finalSamlResponse, 'utf-8').toString('base64');
    // Step 6: Send SAMLResponse to ACS endpoint
    await this.sendSamlResponseToAcs(samlRequestDto.acsUrl, base64SamlResponse);
    return {
      success: true,
      acsUrl: samlRequestDto.acsUrl,
      publicCertificate: samlRequestDto.publicCertificate,
      xml: samlResponseXml, // Raw XML
    };
  }

  /**
   * Builds the SAML Response XML and extracts the embedded Assertion
   * @param samlRequestDto - incoming saml input
   * @returns object containing full SAML response and raw Assertion XML
   * @throws Error if the assertion node cannot be located
   */
  private buildSamlAssertionResponse(samlRequestDto: SamlRequestDto): BuiltSamlParts {
    const { attributes, acsUrl } = samlRequestDto;
    const issueInstant = new Date().toISOString();
    const samlObject = {
      'samlp:Response': {
        '@xmlns:samlp': 'urn:oasis:names:tc:SAML:2.0:protocol',
        '@ID': this.generateSamlId('response'),
        '@Version': '2.0',
        '@IssueInstant': issueInstant,
        '@Destination': acsUrl,
        'saml:Issuer': {
          '@xmlns:saml': 'urn:oasis:names:tc:SAML:2.0:assertion',
          '#': SAML_ISSUER,
        },
        'saml:Assertion': {
          '@xmlns:saml': 'urn:oasis:names:tc:SAML:2.0:assertion',
          '@ID': this.generateSamlId('assertion'),
          '@IssueInstant': issueInstant,
          '@Version': '2.0',
          'saml:Issuer': SAML_ISSUER,
          'saml:Subject': {
            'saml:NameID': this.getAttributeValueOrDefault(attributes.memberId, 'AS83747TB'),
            'saml:SubjectConfirmation': {
              '@Method': 'urn:oasis:names:tc:SAML:2.0:cm:bearer',
              'saml:SubjectConfirmationData': {
                '@NotOnOrAfter': new Date(Date.now() + 5 * 60 * 1000).toISOString(),
                '@Recipient': acsUrl,
              },
            },
          },
          'saml:Conditions': {
            '@NotOnOrAfter': new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            'saml:AudienceRestriction': {
              'saml:Audience': this.getAttributeValueOrDefault(
                attributes.email,
                'john.doe@example.com',
              ),
            },
          },
          'saml:AttributeStatement': {
            'saml:Attribute': [
              this.createSamlAttribute(
                'firstName',
                this.getAttributeValueOrDefault(attributes.firstName, 'John'),
              ),
              this.createSamlAttribute(
                'lastName',
                this.getAttributeValueOrDefault(attributes.lastName, 'Deo'),
              ),
              this.createSamlAttribute(
                'email',
                this.getAttributeValueOrDefault(attributes.email, 'john.doe@example.com'),
              ),
              this.createSamlAttribute(
                'memberId',
                this.getAttributeValueOrDefault(attributes.memberId, 'AS83747TB'),
              ),
            ],
          },
        },
      },
    };
    let xmlDoc: XMLBuilder;
    try {
      xmlDoc = create(samlObject);
    } catch (e) {
      throw new Error('Failed to construct SAML Response XML: ' + (e as Error).message);
    }
    const samlResponseXml = xmlDoc.end({ headless: true, prettyPrint: true });
    // Locate the Assertion node to extract raw XML using predicate function
    const xmlRoot = xmlDoc.root();
    const assertionNode = xmlRoot.find((node) => node.node.nodeName === 'saml:Assertion');
    if (!assertionNode) {
      throw new Error('Generated SAML Response XML is missing the <saml:Assertion> node');
    }
    const assertionXml = assertionNode.end({ headless: true });
    return { samlResponseXml, assertionXml };
  }

  /**
   * Safely returns a string value for a given attribute
   * If the provided value is null or undefined, a fallback value is returned instead
   * @param value - The input value that may be null or undefined
   * @param fallback - The value to return when the input is null/undefined (default: empty string)
   * @returns A safe string value that never returns null or undefined
   */
  private getAttributeValueOrDefault(value: string, fallback = ''): string {
    return value === undefined || value === null ? fallback : value;
  }

  /**
   * Creates a SAML attribute entry
   * @param name - attribute name
   * @param value - attribute value
   * @returns properly formatted attribute object
   */
  private createSamlAttribute(name: string, value: string): object {
    return { '@Name': name, 'saml:AttributeValue': value };
  }

  /**
   * Generates unique XML-compliant IDs
   * @param prefix - identifier prefix
   * @returns unique ID string
   */
  private generateSamlId(prefix: string): string {
    return `${prefix}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Signs a SAML assertion using the Candescent private key
   * @param xml - raw assertion XML
   * @returns signed assertion XML
   * @throws Error if signing fails
   */
  private signAssertion(xml: string, publicCertificate: string): string {
    // Validate certificate
    const validatedCert = this.validateX509Certificate(publicCertificate);
    // Ensure Assertion has an ID or signing WILL break
    const assertionIdMatch = xml.match(/<\s*[^>]*Assertion[^>]*ID="([^"]+)"/);
    if (!assertionIdMatch) {
      throw new Error('SAML Assertion missing ID attribute — cannot sign.');
    }
    // Load private key
    const privateKeyPath = path.resolve(__dirname, PRIVATE_KEY_PATH);
    if (!fs.existsSync(privateKeyPath)) {
      throw new Error(`Private key file not found at: ${privateKeyPath}`);
    }
    const privateKey = fs.readFileSync(privateKeyPath, 'utf-8');
    // Strip headers for KeyInfo
    const certBody = validatedCert
      .replace('-----BEGIN CERTIFICATE-----', '')
      .replace('-----END CERTIFICATE-----', '')
      .replace(/\s+/g, '');
    // Prepare signer
    const signer = new SignedXml() as any;
    // Required: canonicalization algorithm
    signer.canonicalizationAlgorithm = 'http://www.w3.org/2001/10/xml-exc-c14n#';
    signer.signatureAlgorithm = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';
    // Add reference to Assertion with digest and transforms
    signer.addReference({
      xpath: "//*[local-name()='Assertion']",
      transforms: [
        'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
        'http://www.w3.org/2001/10/xml-exc-c14n#',
      ],
      digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
    });
    signer.privateKey = privateKey;
    signer.keyInfoProvider = {
      getKeyInfo: () => `<X509Data><X509Certificate>${certBody}</X509Certificate></X509Data>`,
    };
    // Sign XML
    signer.computeSignature(xml);
    return signer.getSignedXml();
  }

  /**
   * Validates an X.509 PEM certificate
   * @param publicCertificate - vendor provided X.509 certificate in PEM format
   */
  private validateX509Certificate(cert: string): string {
    if (!cert) {
      throw new Error('Certificate is required.');
    }
    // Normalize whitespace
    const normalized = cert.trim().replace(/\r/g, '');
    const pemHeader = '-----BEGIN CERTIFICATE-----';
    const pemFooter = '-----END CERTIFICATE-----';
    if (!normalized.includes(pemHeader) || !normalized.includes(pemFooter)) {
      throw new Error('Invalid certificate: Missing PEM header/footer.');
    }
    try {
      new X509Certificate(normalized);
    } catch (err) {
      throw new Error('Invalid certificate: Parsing failed. ' + (err as Error).message);
    }
    return normalized;
  }

  /**
   * Encrypts a signed SAML assertion using the vendor's public certificate
   * @param assertionXml - signed SAML assertion XML
   * @param publicCertificate - vendor provided X.509 certificate in PEM format
   * @returns encrypted SAML assertion XML
   * @throws Error if certificate is invalid or encryption fails
   */
  private async encryptAssertion(assertionXml: string, publicCertificate: string): Promise<string> {
    try {
      // Validate certificate presence
      if (!publicCertificate) {
        throw new Error('Public certificate is required for encryption.');
      }
      // Validate certificate
      const validatedCert = this.validateX509Certificate(publicCertificate);
      // Clean certificate body for xml-encryption
      const certBody = validatedCert
        .replace('-----BEGIN CERTIFICATE-----', '')
        .replace('-----END CERTIFICATE-----', '')
        .replace(/\s+/g, '');
      const pemCert = `-----BEGIN CERTIFICATE-----\n${certBody}\n-----END CERTIFICATE-----`;
      // Extract public key from certificate
      const certObj = new X509Certificate(pemCert);
      const publicKey = certObj.publicKey.export({ type: 'spki', format: 'pem' });
      if (!publicKey) {
        throw new Error('Failed to extract public key from certificate');
      }
      // Perform encryption
      const encryptedXml = await new Promise<string>((resolve, reject) => {
        xmlenc.encrypt(
          assertionXml,
          {
            rsa_pub: publicKey,
            pem: pemCert,
            encryptionAlgorithm: 'http://www.w3.org/2001/04/xmlenc#aes256-cbc',
            keyEncryptionAlgorithm: 'http://www.w3.org/2001/04/xmlenc#rsa-oaep-mgf1p',
          },
          (err, result) => {
            if (err) return reject(err);
            if (!result) return reject(new Error('xml-encryption returned empty output.'));
            resolve(result);
          },
        );
      });
      // Validate resulting XML
      try {
        create(encryptedXml); // will throw if XML is malformed
      } catch (err) {
        throw new Error('Encrypted SAML Assertion is not valid XML: ' + (err as Error).message);
      }
      return encryptedXml;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error(`SAML encryption failed: ${(error as Error).message}`);
    }
  }

  /**
   * Replaces <saml:Assertion> with <saml:EncryptedAssertion>
   * @param samlResponseXml - original SAML response
   * @param encryptedAssertionXml - encrypted assertion XML
   * @returns new SAML response with encrypted assertion injected
   * @throws Error if response or assertion nodes cannot be located or are malformed
   */
  private replaceAssertionWithEncrypted(
    samlResponseXml: string,
    encryptedAssertionXml: string,
  ): string {
    // Parse the original SAML Response XML
    const responseDoc = create(samlResponseXml);
    const responseRoot = responseDoc.root();
    // Guard: Ensure root is <samlp:Response>
    if (!responseRoot || responseRoot.node.nodeName !== 'samlp:Response') {
      throw new Error('Invalid SAML Response: Root element must be <samlp:Response>.');
    }
    // Locate the plaintext <Assertion>
    const assertionNode = responseRoot.find((node) => node.node.nodeName === 'saml:Assertion');
    if (!assertionNode) {
      throw new Error('Original <saml:Assertion> not found for replacement.');
    }
    // Remove plaintext assertion
    assertionNode.remove();
    // Parse encrypted assertion
    const encryptedDoc = create(encryptedAssertionXml);
    const encryptedRoot = encryptedDoc.root();
    // Guard: Ensure it contains <EncryptedAssertion> or <EncryptedData>
    if (!encryptedRoot.node.nodeName.includes('Encrypted')) {
      throw new Error('Encrypted assertion XML is not valid <EncryptedAssertion>.');
    }
    // Inject encrypted assertion
    const encryptedElement = responseRoot.ele('saml:EncryptedAssertion');
    encryptedElement.import(encryptedRoot);
    // Return updated XML
    return responseRoot.end({ headless: true, prettyPrint: true });
  }

  /**
   * Sends a SAMLResponse to the vendor's Assertion Consumer Service (ACS) endpoint
   * @param acsUrl - The ACS endpoint URL provided by the SAML service provider
   * @param base64SamlResponse - The SAMLResponse XML encoded in Base64 format
   * @returns Returns a Promise that resolves to the response data from the ACS endpoint
   */
  private async sendSamlResponseToAcs(acsUrl: string, base64SamlResponse: string): Promise<any> {
    // const url = `${acsUrl}?${new URLSearchParams({
    //   SAMLResponse: base64SamlResponse,
    // })}`;
    const url = `http://localhost:7000/api/auth-validator/acs?${new URLSearchParams({
      SAMLResponse: base64SamlResponse,
    })}`;
    try {
      const result = await this.httpService.axiosRef.post(url, null, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: TIMEOUT,
      });
      if (result.status < 200 || result.status >= 300) {
        throw new Error(`ACS responded with status ${result.status}`);
      }
      return {
        status: result.status,
        data: result.data,
      };
    } catch (err) {
      // Axios-specific handling
      if (err.isAxiosError) {
        throw new Error(
          `ACS request failed: ${err.response?.status ?? 'No response'} - ${err.message}`,
        );
      }
      throw new Error(`Unexpected error calling ACS endpoint: ${(err as Error).message}`);
    }
  }
}
