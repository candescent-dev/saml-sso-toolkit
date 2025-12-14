import nock from 'nock';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { extractSamlFields } from './samlparser';
import { INestApplication } from '@nestjs/common';
import { readSamlConfig } from '../test/cacheutils';
import { plainToInstance } from 'class-transformer';
import { contains, validate } from 'class-validator';
import { Test, TestingModule } from '@nestjs/testing';
import { SamlRequestDto } from '../src/saml/dto/samlRequest.dto';
import { APP_CONFIG } from '../src/appConfig/appConfig.provider';

const { acsUrl, publicCertificate } = readSamlConfig();

describe('SAML backend testcases (e2e)', () => {
  let app: INestApplication;
  let agent: any;
  let payload: any;
  let xml: any;
  let samlExtracted: any;

  const samlLoginApi = '/saml/login';
  const acsMockURI = 'http://localhost:7000';
  const validatorUri = '/api/saml-validator/acs';
  const acsUrlMock = 'http://localhost:7000/api/saml-validator/acs';
  const issuerTopExpected = 'Candescent';
  const readAcsUrlValue = acsUrl;

  payload = {
    acsUrl: readAcsUrlValue,
    publicCertificate,
    attributes: {
      firstName: 'John',
      lastName: 'Doe',
      memberId: 'AS83747TB',
      email: 'john.doe@example.com',
    },
  };

  const fname = payload.attributes.firstName;
  const lname = payload.attributes.lastName;
  const memId = payload.attributes.memberId;
  const reqCertificate = payload.publicCertificate;
  const mailID = payload.attributes.email;
  const reqAcsUrl = payload.acsUrl;

  beforeAll(async () => {
    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(APP_CONFIG)
        .useValue({
          backendPort: 9999,
        })
        .compile();
      app = moduleFixture.createNestApplication();
      app.useLogger(['log', 'error', 'warn', 'debug', 'verbose']);
      console.log('** BEFORE init **');
      await app.init();
      agent = request.agent(app.getHttpServer());
      console.log('app initialized successfully');
    } catch (e) {
      console.error('Beforeall failed:', e);
      throw e;
    }

    if (readAcsUrlValue !== acsUrlMock) {
      console.log(
        'AcsUrl is different than in cache, pass the cache value in code',
        readAcsUrlValue,
      );
      console.log('if test cases are failing, check the acsurl value if it is correct');
    } else if (readAcsUrlValue == acsUrlMock) {
      console.log('Acs url is same as in cache', readAcsUrlValue);
      console.log('Mock client ACS endpoint');
      nock(acsMockURI).post(validatorUri).query(true).reply(200, { success: true });
      console.log('Mock client ACS endpoint successful');
    } else if (contains(readAcsUrlValue, acsMockURI)) {
      console.log('ACS URL needs server to be up on port', acsMockURI);
    }
  });

  afterAll(async () => {
    //await app.close();
    //await clientApp.close();
  });

  it('check health of backend -> /health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
        expect(res.body.message).toBe('Hello');
        expect(res.body.timestamp).toBeDefined();
        expect(typeof res.body.timestamp).toBe('string');
      });
  });

  it('validate success true message and attributes on saml/login API response', async () => {
    const res = await agent
      .post(samlLoginApi)
      .send(payload)
      .catch((err: any) => {
        console.error('Supertest Error:', err.res?.text || err);
        throw err;
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('publicCertificate', reqCertificate);
    expect(res.body).toHaveProperty('acsUrl', reqAcsUrl);
    expect(res.body).toHaveProperty('xml');
    xml = res.body.xml;
    samlExtracted = extractSamlFields(xml);
    console.log('xml is -> ', res.body);
  }, 40000);

  it('validate saml xml values in saml/login API response', async () => {
    expect(xml).toContain('<samlp:Response');
    expect(xml).toContain('<saml:Assertion');
    expect(xml).toContain('<saml:Issuer>Candescent</saml:Issuer>');
    expect(xml).toContain('IssueInstant=');
    expect(xml).toContain('NotOnOrAfter=');
  }, 4000);

  it('validate <saml:AttributeValue> should be same as in requestbody in saml/login API response', async () => {
    expect(xml).toContain('<saml:NameID>' + memId + '</saml:NameID>');
    expect(xml).toContain(
      '    <saml:AudienceRestriction>\n' +
        '        <saml:Audience>' +
        mailID +
        '</saml:Audience>\n' +
        '      </saml:AudienceRestriction>',
    );
    expect(xml).toContain('<saml:Attribute Name="firstName">');
    expect(xml).toContain('<saml:AttributeValue>' + fname + '</saml:AttributeValue>');
    expect(xml).toContain('<saml:Attribute Name="lastName">');
    expect(xml).toContain('<saml:AttributeValue>' + lname + '</saml:AttributeValue>');
    expect(xml).toContain('<saml:Attribute Name="email">');
    expect(xml).toContain('<saml:AttributeValue>' + mailID + '</saml:AttributeValue>');
    expect(xml).toContain('<saml:Attribute Name="memberId">');
    expect(xml).toContain('<saml:AttributeValue>' + memId + '</saml:AttributeValue>');
  }, 4000);

  it('validate saml extracted values in response', async () => {
    const isoMinute = (d: Date) => d.toISOString().slice(0, 16);
    const expectedDate = new Date(Date.now() + 15 * 60 * 1000);
    expect(samlExtracted.destination).toContain(readAcsUrlValue);
    expect(samlExtracted.issuerTop).toBe(issuerTopExpected);
    expect(samlExtracted.issuerAssertion).toBe(issuerTopExpected);
    expect(samlExtracted.nameId).toBe(memId);
    expect(samlExtracted.scdNotOnOrAfter.slice(0, 16)).toBe(isoMinute(expectedDate));
    expect(samlExtracted.scdRecipient).toBe(readAcsUrlValue);
    expect(samlExtracted.condNotOnOrAfter.slice(0, 16)).toBe(isoMinute(expectedDate));
    expect(samlExtracted.audience).toBe(mailID);
    expect(samlExtracted.attributes.firstName).toBe(fname);
    expect(samlExtracted.attributes.lastName).toBe(lname);
    expect(samlExtracted.attributes.email).toBe(mailID);
    expect(samlExtracted.attributes.memberId).toBe(memId);
  }, 4000);

  it('validate the Response ID, Assertion ID, IssueInstant, Assertion IssueInstant, SubjectConfirmationData, Conditions in xml on hitting the saml/login API twice with same response', async () => {}, 4000);

  function extractAttributeErrors(errors: any[]) {
    const attrs = errors.find((e) => e.property === 'attributes');
    if (!attrs || !attrs.children) return [];

    return attrs.children.flatMap((child) =>
      Object.values(child.constraints ?? {}).map(
        (msg) => `attributes.${child.property} ${(msg as string).split(' ').slice(1).join(' ')}`,
      ),
    );
  }

  it('should fail when no payload is sent', async () => {
    const payload = {};
    const dto = plainToInstance(SamlRequestDto, payload);
    const errors = await validate(dto);
    const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
    expect(messages).toEqual(
      expect.arrayContaining([
        'acsUrl must be a URL address',
        'acsUrl should not be empty',
        'acsUrl must be a string',
        'publicCertificate should not be empty',
        'publicCertificate must be a string',
        'attributes should not be empty',
      ]),
    );
  });

  it('should fail when acsUrl is missing', async () => {
    const payload = {
      publicCertificate,
      attributes: {
        firstName: 'John',
        lastName: 'Doe',
        memberId: 'AS83747TB',
        email: 'john.doe@example.com',
      },
    };
    const dto = plainToInstance(SamlRequestDto, payload);
    const errors = await validate(dto);
    const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
    expect(messages).toEqual(
      expect.arrayContaining([
        'acsUrl must be a URL address',
        'acsUrl should not be empty',
        'acsUrl must be a string',
      ]),
    );
  });

  it('should fail when acsUrl is not VALID', async () => {
    const payload = {
      acsUrl: 1234,
      publicCertificate,
      attributes: {
        firstName: 'John',
        lastName: 'Doe',
        memberId: 'AS83747TB',
        email: 'john.doe@example.com',
      },
    };
    const dto = plainToInstance(SamlRequestDto, payload);
    const errors = await validate(dto);
    const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));

    expect(messages).toEqual(expect.arrayContaining(['acsUrl must be a URL address']));
  });

  it('should fail when acsUrl is empty string', async () => {
    const payload = {
      acsUrl: '',
      publicCertificate,
      attributes: {
        firstName: 'John',
        lastName: 'Doe',
        memberId: 'AS83747TB',
        email: 'john.doe@example.com',
      },
    };
    const dto = plainToInstance(SamlRequestDto, payload);
    const errors = await validate(dto);
    const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
    expect(messages).toEqual(
      expect.arrayContaining(['acsUrl must be a URL address', 'acsUrl should not be empty']),
    );
  });

  it('should fail when publicCertificate is missing', async () => {
    const payload = {
      acsUrl: acsUrlMock,
      attributes: {
        firstName: 'John',
        lastName: 'Doe',
        memberId: 'AS83747TB',
        email: 'john.doe@example.com',
      },
    };
    const dto = plainToInstance(SamlRequestDto, payload);
    const errors = await validate(dto);
    const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
    expect(messages).toEqual(
      expect.arrayContaining([
        'publicCertificate should not be empty',
        'publicCertificate must be a string',
      ]),
    );
  });

  it('should fail when publicCertificate is empty', async () => {
    const payload = {
      acsUrl: acsUrlMock,
      publicCertificate: '',
      attributes: {
        firstName: 'John',
        lastName: 'Doe',
        memberId: 'AS83747TB',
        email: 'john.doe@example.com',
      },
    };
    const dto = plainToInstance(SamlRequestDto, payload);
    const errors = await validate(dto);
    const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
    expect(messages).toEqual(expect.arrayContaining(['publicCertificate should not be empty']));
  });

  it('should fail when all attributes are missing', async () => {
    const dto = plainToInstance(SamlRequestDto, {
      acsUrl: 'https://example.com',
      publicCertificate,
      attributes: {},
    });
    const errors = await validate(dto);
    const messages = extractAttributeErrors(errors);
    expect(messages).toEqual(
      expect.arrayContaining([
        'attributes.firstName should not be empty',
        'attributes.firstName must be a string',
        'attributes.lastName should not be empty',
        'attributes.lastName must be a string',
        'attributes.memberId should not be empty',
        'attributes.memberId must be a string',
        'attributes.email should not be empty',
        'attributes.email must be an email',
      ]),
    );
  });

  it('should fail when email is missing', async () => {
    const payload = {
      acsUrl: acsUrlMock,
      publicCertificate,
      attributes: {
        firstName: 'John',
        lastName: 'Doe',
        memberId: 'AS83747TB',
      },
    };
    const dto = plainToInstance(SamlRequestDto, payload);
    const errors = await validate(dto);
    const messages = extractAttributeErrors(errors);
    expect(messages).toEqual(expect.arrayContaining(['attributes.email should not be empty']));
  });

  it('should fail when email is invalid', async () => {
    const payload = {
      acsUrl: acsUrlMock,
      publicCertificate,
      attributes: {
        firstName: 'John',
        lastName: 'Doe',
        memberId: 'AS83747TB',
        email: 'john.abcd.com',
      },
    };
    const dto = plainToInstance(SamlRequestDto, payload);
    const errors = await validate(dto);
    const messages = extractAttributeErrors(errors);
    expect(messages).toEqual(expect.arrayContaining(['attributes.email must be an email']));
  });

  it('should fail when firstName is missing', async () => {
    const payload = {
      acsUrl: acsUrlMock,
      publicCertificate,
      attributes: {
        lastName: 'Doe',
        memberId: 'AS83747TB',
        email: 'john.abcd.com',
      },
    };
    const dto = plainToInstance(SamlRequestDto, payload);
    const errors = await validate(dto);
    const messages = extractAttributeErrors(errors);
    expect(messages).toEqual(expect.arrayContaining(['attributes.firstName should not be empty']));
  });

  it('should fail when lastName is missing', async () => {
    const payload = {
      acsUrl: acsUrlMock,
      publicCertificate,
      attributes: {
        firstName: 'John',
        memberId: 'AS83747TB',
        email: 'john.abcd.com',
      },
    };
    const dto = plainToInstance(SamlRequestDto, payload);
    const errors = await validate(dto);
    const messages = extractAttributeErrors(errors);
    expect(messages).toEqual(expect.arrayContaining(['attributes.lastName should not be empty']));
  });

  it('should fail when memberId is missing', async () => {
    const payload = {
      acsUrl: acsUrlMock,
      publicCertificate,
      attributes: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.abcd.com',
      },
    };
    const dto = plainToInstance(SamlRequestDto, payload);
    const errors = await validate(dto);
    const messages = extractAttributeErrors(errors);
    expect(messages).toEqual(
      expect.arrayContaining([
        'attributes.memberId should not be empty',
        'attributes.memberId must be a string',
      ]),
    );
  });

  it('should fail when firstname is empty', async () => {
    const payload = {
      acsUrl: acsUrlMock,
      publicCertificate,
      attributes: {
        firstName: '',
        lastName: 'Doe',
        memberId: 'AS83747TB',
        email: 'john.doe@example.com',
      },
    };
    const dto = plainToInstance(SamlRequestDto, payload);
    const errors = await validate(dto);
    const messages = extractAttributeErrors(errors);
    expect(messages).toEqual(expect.arrayContaining(['attributes.firstName should not be empty']));
  });

  it('should fail when lastname is empty', async () => {
    const payload = {
      acsUrl: acsUrlMock,
      publicCertificate,
      attributes: {
        firstName: 'John',
        lastName: '',
        memberId: 'AS83747TB',
        email: 'john.doe@example.com',
      },
    };
    const dto = plainToInstance(SamlRequestDto, payload);
    const errors = await validate(dto);
    const messages = extractAttributeErrors(errors);
    expect(messages).toEqual(expect.arrayContaining(['attributes.lastName should not be empty']));
  });

  it('should fail when email is empty', async () => {
    const payload = {
      acsUrl: acsUrlMock,
      publicCertificate,
      attributes: {
        firstName: 'John',
        lastName: 'Doe',
        memberId: 'AS83747TB',
        email: '',
      },
    };
    const dto = plainToInstance(SamlRequestDto, payload);
    const errors = await validate(dto);
    const messages = extractAttributeErrors(errors);
    expect(messages).toEqual(expect.arrayContaining(['attributes.email should not be empty']));
  });
  it('should fail when memberId is empty', async () => {
    const payload = {
      acsUrl: acsUrlMock,
      publicCertificate,
      attributes: {
        firstName: 'John',
        lastName: 'Doe',
        memberId: '',
        email: 'john.doe@example.com',
      },
    };
    const dto = plainToInstance(SamlRequestDto, payload);
    const errors = await validate(dto);
    const messages = extractAttributeErrors(errors);
    expect(messages).toEqual(expect.arrayContaining(['attributes.memberId should not be empty']));
  });
});
