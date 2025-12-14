import { resolve } from 'path';
import { create } from 'xmlbuilder2';
import xmlenc from 'xml-encryption';
import { SignedXml } from 'xml-crypto';
import { X509Certificate } from 'crypto';
import type { Cache } from 'cache-manager';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { SamlRequestDto } from './dto/samlRequest.dto';
import { SamlSettingData } from './types/samlSetting.types';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import type { XMLBuilder } from 'xmlbuilder2/lib/interfaces';
import { ACSServerResponse, ACSServerData, SamlResult } from './types/saml.types';
import {
  Inject,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';

const SAML_ISSUER: string = 'Candescent';
const LOCAL_CACHE_JSON_RELATIVE_PATH = 'cache.json';
const ZIP_CACHE_JSON_RELATIVE_PATH = '../../../cache.json';
const PRIVATE_KEY_PATH: string = '../../certs/private.pem';

/**
 * Represents the separated SAML components.
 */
interface BuiltSamlParts {
  readonly samlResponseXml: string;
  readonly assertionXml: string;
}

@Injectable()
export class SamlService {
  private readonly loaclCacheJsonPath = resolve(process.cwd(), LOCAL_CACHE_JSON_RELATIVE_PATH);
  private readonly zipCacheJsonPath = resolve(__dirname, ZIP_CACHE_JSON_RELATIVE_PATH);
  private readonly SAML_SETTING_CACHE_KEY = 'saml_setting';
  private readonly TTL_MS = 15 * 60 * 1000; // 15 minutes

  constructor(
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Throws a structured error used by the controller
   * @param message - Error message
   * @param status - HTTP status code (default: 400)
   * @throws {{ message: string, status: number }}
   */
  private throwServiceError(message: string, status = 400): never {
    throw { message, status };
  }

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
    console.log('encryptedAssertionXml:', encryptedAssertionXml);
    // Step 4: Inject encrypted assertion back into the response
    const finalSamlResponse = this.replaceAssertionWithEncrypted(
      samlResponseXml,
      encryptedAssertionXml,
    );
    console.log('finalSamlResponse:', finalSamlResponse);
    // STEP 5: Base64-encode SAML Response
    const base64SamlResponse = Buffer.from(finalSamlResponse, 'utf-8').toString('base64');
    console.log('base64SamlResponse:', base64SamlResponse);
    // Step 6: Send SAMLResponse to ACS endpoint
    const response: ACSServerResponse<ACSServerData> = await this.sendSamlResponseToAcs(
      samlRequestDto.acsUrl,
      base64SamlResponse,
    );
    console.log('ACSServerResponse:', response);
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
                '@NotOnOrAfter': new Date(Date.now() + 15 * 60 * 1000).toISOString(),
                '@Recipient': acsUrl,
              },
            },
          },
          'saml:Conditions': {
            '@NotOnOrAfter': new Date(Date.now() + 15 * 60 * 1000).toISOString(),
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
      this.throwServiceError('Failed to construct SAML Response XML: ' + (e as Error).message, 500);
    }
    const samlResponseXml = xmlDoc.end({ headless: true, prettyPrint: true });
    // Locate the Assertion node to extract raw XML using predicate function
    const xmlRoot = xmlDoc.root();
    const assertionNode = xmlRoot.find((node) => node.node.nodeName === 'saml:Assertion');
    if (!assertionNode) {
      this.throwServiceError(
        'Generated SAML Response XML is missing the <saml:Assertion> node',
        500,
      );
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
      this.throwServiceError('SAML Assertion missing ID attribute — cannot sign', 500);
    }
    // Load private key
    const privateKeyPath = resolve(__dirname, PRIVATE_KEY_PATH);
    if (!existsSync(privateKeyPath)) {
      this.throwServiceError(`Private key file not found at: ${privateKeyPath}`, 500);
    }
    const privateKey = readFileSync(privateKeyPath, 'utf-8');
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
      this.throwServiceError('Certificate is required', 400);
    }
    // Normalize whitespace
    const normalized = cert.trim().replace(/\r/g, '');
    const pemHeader = '-----BEGIN CERTIFICATE-----';
    const pemFooter = '-----END CERTIFICATE-----';
    if (!normalized.includes(pemHeader) || !normalized.includes(pemFooter)) {
      this.throwServiceError('Invalid certificate format', 422);
    }
    try {
      new X509Certificate(normalized);
    } catch (err) {
      this.throwServiceError('Certificate parsing failed: ' + (err as Error).message, 422);
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
        this.throwServiceError('Public certificate is required for encryption', 400);
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
        this.throwServiceError('Failed to extract public key from certificate', 422);
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
            if (!result) return reject(new Error('xml-encryption returned empty output'));
            resolve(result);
          },
        );
      });
      // Validate resulting XML
      try {
        create(encryptedXml); // will throw if XML is malformed
      } catch (err) {
        this.throwServiceError(
          'Encrypted SAML Assertion is not valid XML: ' + (err as Error).message,
          500,
        );
      }
      return encryptedXml;
    } catch (error) {
      console.error('Encryption error:', error);
      this.throwServiceError(`SAML encryption failed: ${(error as Error).message}`, 500);
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
      this.throwServiceError('Invalid SAML Response: Root <samlp:Response> missing', 500);
    }
    // Locate the plaintext <Assertion>
    const assertionNode = responseRoot.find((node) => node.node.nodeName === 'saml:Assertion');
    if (!assertionNode) {
      this.throwServiceError('Plaintext Assertion missing in SAML Response', 500);
    }
    // Remove plaintext assertion
    assertionNode.remove();
    // Parse encrypted assertion
    const encryptedDoc = create(encryptedAssertionXml);
    const encryptedRoot = encryptedDoc.root();
    // Guard: Ensure it contains <EncryptedAssertion> or <EncryptedData>
    if (!encryptedRoot.node.nodeName.includes('Encrypted')) {
      this.throwServiceError('Encrypted assertion XML is invalid', 500);
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
    const url = `${acsUrl}?${new URLSearchParams({
      SAMLResponse: base64SamlResponse,
    })}`;
    try {
      const result = await this.httpService.axiosRef.post(url, null, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      if (result.status < 200 || result.status >= 300) {
        this.throwServiceError(`ACS responded with status ${result.status}`, result.status || 502);
      }
      return {
        status: result.status,
        data: result.data,
      };
    } catch (err) {
      if (err.isAxiosError) {
        const status = err.response?.status || 502;
        // Pick first available message from multiple possible locations
        const finalMessage =
          (err.response?.data?.message && typeof err.response.data.message === 'string'
            ? err.response.data.message
            : null) ||
          (err.response?.message && typeof err.response.message === 'string'
            ? err.response.message
            : null) ||
          (err.message && typeof err.message === 'string' ? err.message : 'ACS request failed');
        this.throwServiceError(finalMessage, status);
      } else {
        // Non-Axios unexpected errors
        this.throwServiceError(
          (err as Error).message || 'Unexpected error calling ACS endpoint',
          500,
        );
      }
    }
  }

  /**
   * Stores saml setting in both cache and cache.json file
   * @param acsUrl - The ACS endpoint URL provided by the SAML service provider
   * @throws NotFoundException If the cache.json file does not exist
   * @throws InternalServerErrorException If saving to the file or cache fails
   */
  async saveSamlSetting(acsUrl: string, publicCertificate: string): Promise<void> {
    const samlSettingData: SamlSettingData = {
      acsUrl,
      publicCertificate,
      updatedAt: new Date().toISOString(),
    };
    const targetPath = existsSync(this.loaclCacheJsonPath)
      ? this.loaclCacheJsonPath
      : existsSync(this.zipCacheJsonPath)
        ? this.zipCacheJsonPath
        : null;
    if (!targetPath) {
      throw new NotFoundException(
        `cache.json not found in expected locations:\n` +
          `- ${this.loaclCacheJsonPath}\n` +
          `- ${this.zipCacheJsonPath}`,
      );
    }
    // Save to file
    try {
      writeFileSync(targetPath, JSON.stringify(samlSettingData, null, 2), 'utf8');
    } catch {
      throw new InternalServerErrorException('Failed to save saml setting');
    }
    // Save to cache
    try {
      await this.cacheManager.set(this.SAML_SETTING_CACHE_KEY, { acsUrl }, this.TTL_MS);
    } catch {
      throw new InternalServerErrorException('Failed to save saml setting to cache');
    }
  }

  /**
   * Retrieve cached saml setting, or undefined if expired.
   */
  async getSamlSettingFromCache(): Promise<SamlSettingData | undefined> {
    return await this.cacheManager.get<SamlSettingData>(this.SAML_SETTING_CACHE_KEY);
  }
}
