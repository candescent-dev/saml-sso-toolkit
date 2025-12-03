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

describe('SAML backend testcases (e2e)', () => {
  let app: INestApplication;
  let agent: any;
  let payload: any;

  const samlLoginApi = '/saml/login';
  const acsUrlMock = 'http://localhost:7000/api/saml-validator/acs';

  const validCertificate = `
-----BEGIN CERTIFICATE-----\nMIIDqDCCApACCQDxEV5XnYNRzzANBgkqhkiG9w0BAQsFADCBlTELMAkGA1UEBhMC\nVVMxEDAOBgNVBAgMB0dlb3JnaWExEDAOBgNVBAcMB0F0bGFudGExEzARBgNVBAoM\nCkNhbmRlc2NlbnQxCzAJBgNVBAsMAklUMRswGQYDVQQDDBJpZHAuY2FuZGVzY2Vu\ndC5jb20xIzAhBgkqhkiG9w0BCQEWFGFkbWluQGNhbmRlc2NlbnQuY29tMB4XDTI1\nMTEyNTE0MTQyN1oXDTMwMTEyNDE0MTQyN1owgZUxCzAJBgNVBAYTAlVTMRAwDgYD\nVQQIDAdHZW9yZ2lhMRAwDgYDVQQHDAdBdGxhbnRhMRMwEQYDVQQKDApDYW5kZXNj\nZW50MQswCQYDVQQLDAJJVDEbMBkGA1UEAwwSaWRwLmNhbmRlc2NlbnQuY29tMSMw\nIQYJKoZIhvcNAQkBFhRhZG1pbkBjYW5kZXNjZW50LmNvbTCCASIwDQYJKoZIhvcN\nAQEBBQADggEPADCCAQoCggEBAN+soEjTOAAC2ZSrPekQdZfKa+9i3dsuC5/ZJ0W6\nSV8gcB3Bj3okl5lmaeGFPfiITakr1W1CsI3RMMbT1E0u7zOHziiVZURzFOhWe6hZ\nwzfA3XGESLHtSPJ5Xq+TzzWC3FWbtRpP9IKYp89x0q4kvUgcXnlCDCS3SdshXgtM\nYKaGWqnz9QatsOPRYzXUnR+xjJ1xW3jjK1cXZ54iXmBnLmVmilTZrt8V1rsre9GU\nzkO/Vxhb8LXSK5OGjxm+5qqWnsHKWoNjmai2cybe/Cw2KlnkZ6Wg568is9AaMUKD\nbQxfyzF2HUX3FlC0b5kZAoiafllV7PsWmoPffzYLIZd1KncCAwEAATANBgkqhkiG\n9w0BAQsFAAOCAQEA13V3AypnvXGw5CZ35AhOiXQqFgwyoPOh+QOVcg1g1gcA/GS3\nkjkR8k6W63ygSjXQgO/wqYgGbGM6Y63HLnk9qFtOrjN8blnNlzTthDrlzmSA8gQe\nmvuGQvzD07r1tmZ+geM0qyWdaSF+qDgvSgWDf2jsqt0oOpoaZruRwvrR9rDM894S\nWJU+DUOrZq2AHoX/WEEOzW0Xv+hDvYaSN6MRIhjI9gpLVYePucJO+uUFrVkxBk7V\neDYzQeH3at2IQ1sLnXM/mjgP4andCbAmO2Fu1gdTJrQDPUYR4PfRFgx21hznvbGq\nbQWIuQDwgWcnppYvbA/BzUiXXg8Mg3xg4X9oGQ==\n-----END CERTIFICATE-----
`.trim(); // KEEP line breaks intact
  payload = {
    acsUrl: acsUrlMock,   // <-- ADD THIS LINE
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