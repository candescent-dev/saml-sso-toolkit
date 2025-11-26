import * as fs from 'fs';
import * as path from 'path';
import { create } from 'xmlbuilder2';
import xmlenc from 'xml-encryption';
import { SignedXml } from 'xml-crypto';
import { X509Certificate } from 'crypto';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { SimulationDto } from './dto/simulation.dto';
import type { XMLBuilder } from 'xmlbuilder2/lib/interfaces';

const PRIVATE_KEY_PATH = '../../certs/private.pem';

/**
 * Represents the separated SAML components.
 */
interface BuiltSamlParts {
  readonly fullResponseXml: string;
  readonly rawAssertionXml: string;
}

@Injectable()
export class SimulationService {
  constructor(private readonly httpService: HttpService) {}

  /**
   * Orchestrates the simulation workflow.
   * @param simulationDto - validated simulation request
   * @returns final SAML response and metadata
   * @throws Error if SAML construction, signing, or encryption fails
   */
  public async processSimulation(simulationDto: SimulationDto): Promise<Record<string, unknown>> {
    // Step 1: Generate Base SAML Assertion
    const { fullResponseXml, rawAssertionXml } = this.buildSamlResponse(simulationDto);
    console.log('fullResponseXml:', fullResponseXml);
    console.log('rawAssertionXml:', rawAssertionXml);
    // Step 2: Sign the raw assertion with Candescent private key
    const signedAssertionXml = this.signSamlAssertion(
      rawAssertionXml,
      simulationDto.publicCertificate,
    );
    // Step 3: Encrypt the signed assertion using vendor's public certificate
    const encryptedSignedAssertionXml = await this.encryptSamlAssertion(
      signedAssertionXml,
      simulationDto.publicCertificate,
    );
    // Step 4: Inject encrypted assertion back into the response
    const finalSamlResponse = this.insertEncryptedAssertion(
      fullResponseXml,
      encryptedSignedAssertionXml,
    );
    // STEP 5: Base64-encode SAML Response
    const base64SamlResponse = Buffer.from(finalSamlResponse, 'utf-8').toString('base64');
    // STEP 6: POST SAMLResponse to ACS URL
    const acsResponse = await this.postToAcs(simulationDto.acsUrl, base64SamlResponse);
    return {
      success: true,
      xml: finalSamlResponse, // Raw XML
      base64: base64SamlResponse, // Payload - sent to Vendor
      acsResponse, // Response from vendor
    };
  }

  /**
   * Builds the SAML Response XML and extracts the embedded Assertion.
   * @param simulationDto - incoming simulation input
   * @returns object containing full SAML response and raw Assertion XML
   * @throws Error if the assertion node cannot be located
   */
  private buildSamlResponse(simulationDto: SimulationDto): BuiltSamlParts {
    const { attributes, acsUrl } = simulationDto;
    const issueInstant = new Date().toISOString();
    const samlObject = {
      'samlp:Response': {
        '@xmlns:samlp': 'urn:oasis:names:tc:SAML:2.0:protocol',
        '@ID': this.generateUniqueId('response'),
        '@Version': '2.0',
        '@IssueInstant': issueInstant,
        '@Destination': acsUrl,
        'saml:Issuer': {
          '@xmlns:saml': 'urn:oasis:names:tc:SAML:2.0:assertion',
          '#': 'Candescent',
        },
        'saml:Assertion': {
          '@xmlns:saml': 'urn:oasis:names:tc:SAML:2.0:assertion',
          '@ID': this.generateUniqueId('assertion'),
          '@IssueInstant': issueInstant,
          '@Version': '2.0',
          'saml:Issuer': 'Candescent',
          'saml:Subject': {
            'saml:NameID': attributes.memberId,
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
              'saml:Audience': attributes.email || 'test@test.com',
            },
          },
          'saml:AttributeStatement': {
            'saml:Attribute': [
              this.buildAttribute('firstName', attributes.firstName),
              this.buildAttribute('lastName', attributes.lastName),
              this.buildAttribute('email', attributes.email),
              this.buildAttribute('memberId', attributes.memberId),
            ],
          },
        },
      },
    };
    const xmlDoc: XMLBuilder = create(samlObject);
    const fullResponseXml = xmlDoc.end({ headless: true, prettyPrint: true });
    // Locate the Assertion node to extract raw XML using predicate function
    const xmlRoot = xmlDoc.root();
    const assertionNode = xmlRoot.find((node) => node.node.nodeName === 'saml:Assertion');
    if (!assertionNode) {
      throw new Error('Failed to locate <saml:Assertion> in generated XML.');
    }
    const rawAssertionXml = assertionNode.end({ headless: true });
    return { fullResponseXml, rawAssertionXml };
  }

  /**
   * Creates a SAML attribute entry.
   * @param name - attribute name
   * @param value - attribute value
   * @returns properly formatted attribute object
   */
  private buildAttribute(name: string, value: string): object {
    return { '@Name': name, 'saml:AttributeValue': value };
  }

  /**
   * Generates unique XML-compliant IDs.
   * @param prefix - identifier prefix
   * @returns unique ID string
   */
  private generateUniqueId(prefix: string): string {
    return `${prefix}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Signs a SAML assertion using the Candescent private key.
   * @param xml - raw assertion XML
   * @returns signed assertion XML
   * @throws Error if signing fails
   */
  private signSamlAssertion(xml: string, publicCertificate: string): string {
    const privateKeyPath = path.resolve(__dirname, PRIVATE_KEY_PATH);
    if (!fs.existsSync(privateKeyPath)) {
      throw new Error(`Private key file not found at: ${privateKeyPath}`);
    }
    const privateKey = fs.readFileSync(privateKeyPath, 'utf-8');
    // Clean the certificate for KeyInfo (remove headers and newlines)
    const cert = publicCertificate.replace(
      /-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\n/g,
      '',
    );
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
      getKeyInfo: () => `<X509Data><X509Certificate>${cert}</X509Certificate></X509Data>`,
      getKey: () => privateKey,
    };
    signer.computeSignature(xml);
    return signer.getSignedXml();
  }

  /**
   * Encrypts a signed SAML assertion using the vendor's public certificate.
   * @param assertionXml - signed SAML assertion XML
   * @param publicCertificate - vendor provided X.509 certificate in PEM format
   * @returns encrypted SAML assertion XML
   * @throws Error if certificate is invalid or encryption fails
   */
  private async encryptSamlAssertion(
    assertionXml: string,
    publicCertificate: string,
  ): Promise<string> {
    try {
      // Validate certificate format
      if (!publicCertificate.includes('BEGIN CERTIFICATE')) {
        throw new Error('Invalid certificate format: missing BEGIN CERTIFICATE');
      }
      // Extract public key from certificate
      const cert = new X509Certificate(publicCertificate);
      const publicKey = cert.publicKey.export({ type: 'spki', format: 'pem' });
      if (!publicKey) {
        throw new Error('Failed to extract public key from certificate');
      }
      // xml-encryption uses callback, so wrap in a Promise
      return await new Promise<string>((resolve, reject) => {
        xmlenc.encrypt(
          assertionXml,
          {
            rsa_pub: publicKey,
            pem: publicCertificate,
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
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error(`SAML encryption failed: ${(error as Error).message}`);
    }
  }

  /**
   * Replaces <saml:Assertion> with <saml:EncryptedAssertion>.
   * @param fullResponseXml - original SAML response
   * @param encryptedAssertionXml - encrypted assertion XML
   * @returns new SAML response with encrypted assertion injected
   * @throws Error if response or assertion nodes cannot be located
   */
  private insertEncryptedAssertion(fullResponseXml: string, encryptedAssertionXml: string): string {
    // Parse the original SAML Response XML
    const responseRoot = create(fullResponseXml).root();
    // Root is already <samlp:Response>
    const parentResponseNode = responseRoot;
    // Locate the plaintext assertion
    const assertionNode = parentResponseNode.find(
      (node) => node.node.nodeName === 'saml:Assertion',
    );
    if (!assertionNode) {
      throw new Error('Original <saml:Assertion> not found for replacement.');
    }
    // Remove plaintext assertion
    assertionNode.remove();
    // Insert encrypted assertion
    parentResponseNode.ele('saml:EncryptedAssertion').import(create(encryptedAssertionXml).root());
    // Return updated XML
    return responseRoot.end({ headless: true, prettyPrint: true });
  }

  /**
   * Sends a SAMLResponse to the vendor's Assertion Consumer Service (ACS) endpoint.
   * @param acsUrl - The ACS endpoint URL provided by the SAML service provider.
   * @param base64SamlResponse - The SAMLResponse XML encoded in Base64 format.
   * @returns Returns a Promise that resolves to the response data from the ACS endpoint.
   */
  private async postToAcs(acsUrl: string, base64SamlResponse: string): Promise<any> {
    // Prepare form-urlencoded parameters
    const params = new URLSearchParams();
    params.append('SAMLResponse', base64SamlResponse);
    // POST the SAMLResponse to the ACS URL
    // const result = await this.httpService.axiosRef.post(acsUrl, params.toString(), {
    //   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    // });
    const result = await this.httpService.axiosRef.post(
      'http://localhost:7000/api/auth-validator/test',
      params.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    );
    //  Return the vendor's response
    return result.data;
  }
}
