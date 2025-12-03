import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { APP_CONFIG } from '../src/appConfig/appConfig.provider';
import { startClientTestServer } from "../src/test-bootstrap";
import { plainToInstance } from 'class-transformer';
import { SamlRequestDto } from '../src/saml/dto/samlRequest.dto';
import { validate } from 'class-validator';
import nock from 'nock';
import fs from 'fs';
import path from 'path';

console.log(startClientTestServer);

describe('SAML backend testcases (e2e)', () => {
  let app: INestApplication;
  let agent: any;
  let payload: any;

  const samlLoginApi = '/saml/login';
  const acsUrlMock = 'http://localhost:7000/api/saml-validator/acs';

  const certPath = path.join(__dirname, '../../../client-web-app/certs/public.crt');
  const validCertificate = fs.readFileSync(certPath, 'utf8');

 payload = {
    acsUrl: 'https://vendor.example.com/saml/acs',   // <-- ADD THIS LINE
    publicCertificate: validCertificate,
    attributes: {
      firstName: 'John',
      lastName: 'Doe',
      memberId: 'AS83747TB',
      email: 'john.doe@example.com',
    },
  };

  beforeAll(async () => {
    try {
      //clientApp = await startClientTestServer();   // starts on port 7000
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
      console.log('Mock client ACS endpoint');
      nock('http://localhost:7000')
        .post('/api/saml-validator/acs').query(true) // ignore query details
        .reply(200, { success: true });
      console.log('Mock client ACS endpoint successful');
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

  it('validate POST saml/login details in response', async () => {
    console.log('validate POST saml/login details in response');
    const res = await agent.post(samlLoginApi).send(payload).catch((err: any) => {
      console.error('Supertest Error:', err.res?.text || err);
      throw err;
    });
    console.log('Response from SAML login API:', res.body);
    expect(res.status).toBe(201);
  },10000);

   it('validate success true message on saml/login API', async () => {
    console.log('validate success true message on saml/login API');
    const requestBody = {
    acsUrl: "http://localhost:7000/api/saml-validator/acs",
    publicCertificate:  validCertificate,
    attributes: {
      firstName: "John",
      lastName: "Doe",
      memberId: "AS83747TB",
      email: "john.doe@example.com"
    }
  }

  const fname = requestBody.attributes.firstName;
  const lname = requestBody.attributes.lastName;
  const memId = requestBody.attributes.memberId;
  const reqCertificate = requestBody.publicCertificate;
  const mailID = requestBody.attributes.email;
  const reqAcsUrl = requestBody.acsUrl;


  const res = await agent.post(samlLoginApi).set('Content-Type', 'application/json')
    .send(requestBody).catch((err: any) => {
      console.error('Supertest Error:', err.res?.text || err);
      throw err;
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('publicCertificate',reqCertificate);
    expect(res.body).toHaveProperty('acsUrl',reqAcsUrl);
    expect(res.body).toHaveProperty('xml');
    
    const xml = res.body.xml;

  // -----------------------------
  // XML ASSERTIONS
  // -----------------------------
  expect(xml).toContain('<samlp:Response');
  expect(xml).toContain('<saml:Assertion');
  expect(xml).toContain('<saml:Issuer>Candescent</saml:Issuer>');
  expect(xml).toContain('<saml:NameID>'+memId+'</saml:NameID>');
  expect(xml).toContain('<saml:Attribute Name="firstName">');
  expect(xml).toContain('<saml:AttributeValue>'+fname+'</saml:AttributeValue>');
  expect(xml).toContain('<saml:Attribute Name="lastName">');
  expect(xml).toContain('<saml:AttributeValue>'+lname+'</saml:AttributeValue>');
  expect(xml).toContain('<saml:Attribute Name="email">');
  expect(xml).toContain('<saml:AttributeValue>'+mailID+'</saml:AttributeValue>');
  expect(xml).toContain('<saml:Attribute Name="memberId">');
  expect(xml).toContain('<saml:AttributeValue>'+memId+'</saml:AttributeValue>');
  expect(xml).toContain('IssueInstant=');
  expect(xml).toContain('NotOnOrAfter=');

  console.log('Verified response status is 201, success is true, public certificate is valid and xml is present.', res.body);
  }, 4000);

    function extractAttributeErrors(errors: any[]) {
    const attrs = errors.find(e => e.property === 'attributes');
    if (!attrs || !attrs.children) return [];

    return attrs.children.flatMap(child =>
      Object.values(child.constraints ?? {}).map(msg =>
        `attributes.${child.property} ${(msg as string).split(' ').slice(1).join(' ')}`
      )
    );
  }

  it('should fail when no payload is sent', async () => {
    const payload = {};
    const dto = plainToInstance(SamlRequestDto, payload);
    const errors = await validate(dto);
    const messages = errors
      .flatMap(e => Object.values(e.constraints ?? {}));
    expect(messages).toEqual(
      expect.arrayContaining([
        'acsUrl must be a URL address',
        'acsUrl should not be empty',
        'acsUrl must be a string',
        'publicCertificate should not be empty',
        'publicCertificate must be a string',
        'attributes should not be empty',
      ])
    );
  });

  it('should fail when acsUrl is missing', async () => {
    const payload = {
      publicCertificate: validCertificate,
      attributes: {
        firstName: 'John',
        lastName: 'Doe',
        memberId: 'AS83747TB',
        email: 'john.doe@example.com',
      },
    };
    const dto = plainToInstance(SamlRequestDto, payload);
    const errors = await validate(dto);
    const messages = errors
      .flatMap(e => Object.values(e.constraints ?? {}));

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
      publicCertificate: validCertificate,
      attributes: {
        firstName: 'John',
        lastName: 'Doe',
        memberId: 'AS83747TB',
        email: 'john.doe@example.com',
      },
    };
    const dto = plainToInstance(SamlRequestDto, payload);
    const errors = await validate(dto);
    const messages = errors
      .flatMap(e => Object.values(e.constraints ?? {}));

    expect(messages).toEqual(
      expect.arrayContaining(['acsUrl must be a URL address']),
    );
  });

  it('should fail when acsUrl is empty string', async () => {
    const payload = {
      acsUrl: '',
      publicCertificate: validCertificate,
      attributes: {
        firstName: 'John',
        lastName: 'Doe',
        memberId: 'AS83747TB',
        email: 'john.doe@example.com',
      },
    };
    const dto = plainToInstance(SamlRequestDto, payload);
    const errors = await validate(dto);
    const messages = errors
      .flatMap(e => Object.values(e.constraints ?? {}));

    expect(messages).toEqual(
      expect.arrayContaining([
        'acsUrl must be a URL address',
        'acsUrl should not be empty',

      ]),
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
    const messages = errors
      .flatMap(e => Object.values(e.constraints ?? {}));

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
      publicCertificate: "",
      attributes: {
        firstName: 'John',
        lastName: 'Doe',
        memberId: 'AS83747TB',
        email: 'john.doe@example.com',
      },
    };


    const dto = plainToInstance(SamlRequestDto, payload);
    const errors = await validate(dto);
    const messages = errors
      .flatMap(e => Object.values(e.constraints ?? {}));

    expect(messages).toEqual(
      expect.arrayContaining([
        'publicCertificate should not be empty',
      ]),
    );
  });


  it('should fail when all attributes are missing', async () => {
    const dto = plainToInstance(SamlRequestDto, {
      acsUrl: "https://example.com",
      publicCertificate: validCertificate,
      attributes: {}
    });

    const errors = await validate(dto);
    const messages = extractAttributeErrors(errors);

    expect(messages).toEqual(
      expect.arrayContaining([
        "attributes.firstName should not be empty",
        "attributes.firstName must be a string",
        "attributes.lastName should not be empty",
        "attributes.lastName must be a string",
        "attributes.memberId should not be empty",
        "attributes.memberId must be a string",
        "attributes.email should not be empty",
        "attributes.email must be an email",
      ])
    );
  });


  it('should fail when email is missing', async () => {
    const payload = {
      acsUrl: acsUrlMock,   // <-- ADD THIS LINE
      publicCertificate: validCertificate,
      attributes: {
        firstName: 'John',
        lastName: 'Doe',
        memberId: 'AS83747TB',
      },
    };
    const dto = plainToInstance(SamlRequestDto, payload);
    const errors = await validate(dto);
    const messages = extractAttributeErrors(errors);


    expect(messages).toEqual(
      expect.arrayContaining(['attributes.email should not be empty']),
    );
  });

  it('should fail when email is invalid', async () => {
    const payload = {
      acsUrl: acsUrlMock,   // <-- ADD THIS LINE
      publicCertificate: validCertificate,
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


    expect(messages).toEqual(
      expect.arrayContaining(['attributes.email must be an email']),
    );
  });

  it('should fail when firstName is missing', async () => {
    const payload = {
      acsUrl: acsUrlMock,   // <-- ADD THIS LINE
      publicCertificate: validCertificate,
      attributes: {
        lastName: 'Doe',
        memberId: 'AS83747TB',
        email: 'john.abcd.com',
      },
    };
    const dto = plainToInstance(SamlRequestDto, payload);
    const errors = await validate(dto);
    const messages = extractAttributeErrors(errors);


    expect(messages).toEqual(
      expect.arrayContaining(['attributes.firstName should not be empty']),
    );
  });

  it('should fail when lastName is missing', async () => {
    const payload = {
      acsUrl: acsUrlMock,   // <-- ADD THIS LINE
      publicCertificate: validCertificate,
      attributes: {
        firstName: 'John',
        memberId: 'AS83747TB',
        email: 'john.abcd.com',
      },
    };
    const dto = plainToInstance(SamlRequestDto, payload);
    const errors = await validate(dto);
    const messages = extractAttributeErrors(errors);


    expect(messages).toEqual(
      expect.arrayContaining(['attributes.lastName should not be empty']),
    );
  });

  it('should fail when memberId is missing', async () => {
    const payload = {
      acsUrl: acsUrlMock,   // <-- ADD THIS LINE
      publicCertificate: validCertificate,
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
      acsUrl: acsUrlMock,   // <-- ADD THIS LINE
      publicCertificate: validCertificate,
      attributes: {
        firstName: '',
        lastName: 'Doe',
        memberId: 'AS83747TB',
        email: 'john.doe@example.com',
      },
    };
    const dto = plainToInstance(SamlRequestDto, payload);
    const errors = await validate(dto);
    const messages = extractAttributeErrors(errors)

    expect(messages).toEqual(
      expect.arrayContaining(['attributes.firstName should not be empty']),
    );
  });

  it('should fail when lastname is empty', async () => {
    const payload = {
      acsUrl: acsUrlMock,   // <-- ADD THIS LINE
      publicCertificate: validCertificate,
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


    expect(messages).toEqual(
      expect.arrayContaining(['attributes.lastName should not be empty']),
    );
  });

  it('should fail when email is empty', async () => {
    const payload = {
      acsUrl: acsUrlMock,   // <-- ADD THIS LINE
      publicCertificate: validCertificate,
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


    expect(messages).toEqual(
      expect.arrayContaining(['attributes.email should not be empty']),
    );
  });
  it('should fail when memberId is empty', async () => {
    const payload = {
      acsUrl: acsUrlMock,   // <-- ADD THIS LINE
      publicCertificate: validCertificate,
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


    expect(messages).toEqual(
      expect.arrayContaining(['attributes.memberId should not be empty']),
    );
  });


});