import { Injectable } from '@nestjs/common';
import { SimulationDto } from './dto/simulation.dto';
import { create } from 'xmlbuilder2';

/**
 * Service responsible for all simulation business logic.
 * Encapsulates SAML construction, encryption, signing, and ACS transmission.
 */
@Injectable()
export class SimulationService {
  /**
   * Processes a simulation request.
   *
   * Steps:
   * 1. Build SAML XML using attributes
   * 2. Encrypt assertion using vendor's public key
   * 3. Sign assertion with Candescent private key
   * 4. Post SAMLResponse to vendor ACS URL
   *
   * @param simulationDto - validated input from frontend
   * @returns result object or throws error on failure
   */
  public async processSimulation(simulationDto: SimulationDto): Promise<Record<string, unknown>> {
    // Step 1: Build SAML XML
    const samlXml: string = this.buildSamlAssertion(simulationDto.attributes, simulationDto.acsUrl);
    // TODO:
    // Step 2: Encrypt assertion using vendor's public key
    // Step 3: Sign assertion with Candescent private key
    // Step 4: POST SAMLResponse to ACS URL
    return {
      acsUrl: simulationDto.acsUrl,
      samlAssertion: samlXml,
      message: 'Simulation processed successfully (mocked)',
    };
  }

  /**
   * Builds a basic SAML Assertion XML string from user attributes.
   * @param attributes - user attributes from frontend
   * @returns SAML assertion as XML string
   */
  private buildSamlAssertion(attributes: SimulationDto['attributes'], acsUrl: string): string {
    const now = new Date().toISOString();
    const xmlObj = {
      'samlp:Response': {
        '@xmlns:samlp': 'urn:oasis:names:tc:SAML:2.0:protocol',
        '@ID': `id-${Math.random().toString(36).substring(2, 15)}`,
        '@Version': '2.0',
        '@IssueInstant': now,
        'saml:Issuer': {
          '@xmlns:saml': 'urn:oasis:names:tc:SAML:2.0:assertion',
          '#': 'Candescent-Simulator',
        },
        'saml:Assertion': {
          '@xmlns:saml': 'urn:oasis:names:tc:SAML:2.0:assertion',
          '@ID': `assertion-${Math.random().toString(36).substring(2, 15)}`,
          '@IssueInstant': now,
          '@Version': '2.0',
          'saml:Subject': {
            'saml:NameID': attributes.memberId,
            'saml:SubjectConfirmation': {
              '@Method': 'urn:oasis:names:tc:SAML:2.0:cm:bearer',
              'saml:SubjectConfirmationData': {
                '@NotOnOrAfter': new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
                '@Recipient': acsUrl,
              },
            },
          },
          'saml:AttributeStatement': {
            'saml:Attribute': [
              { '@Name': 'firstName', 'saml:AttributeValue': attributes.firstName },
              { '@Name': 'lastName', 'saml:AttributeValue': attributes.lastName },
              { '@Name': 'email', 'saml:AttributeValue': attributes.email },
              { '@Name': 'memberId', 'saml:AttributeValue': attributes.memberId },
            ],
          },
        },
      },
    };
    const xmlDoc = create(xmlObj);
    return xmlDoc.end({ headless: true, prettyPrint: true });
  }
}
