import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { APP_CONFIG } from '../src/appConfig/appConfig.provider';
import { startClientTestServer } from "../../../client-web-app/src/test-bootstrap";
console.log(startClientTestServer);

describe('SAML backend testcases (e2e)', () => {
  let app: INestApplication;
  let agent: any;
  let clientApp:any;
  let sampleApp:any;
  let payload:any;

  const samlLoginApi = '/saml/login';

    const validCertificate = `
-----BEGIN CERTIFICATE-----
MIIBsjCCAVmgAwIBAgIJAO5O0vD5x1NnMAoGCCqGSM49BAMCMBUxEzARBgNVBAMM
Cm15dGVzdENlcnQwHhcNMjUxMTI1MTQ3NjAwWhcNMjYxMTI0MTQ3NjAwWjAVMRMw
EQYDVQQDDApteXRlc3RDZXJ0MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE6FqB
aN0O5iR3v95vRvLBMZxOkNLo9r5zSqt5O8Xo2nJ9kYgEuk9o+VwD0MxNLXkOdWIn
d9M1sG9u4qpm9rkY4KNTMFEwHQYDVR0OBBYEFJCpW+7N7NHt5R+GECkW8D0u4eFR
MB8GA1UdIwQYMBaAFJCpW+7N7NHt5R+GECkW8D0u4eFRMA8GA1UdEwEB/wQFMAMB
Af8wCgYIKoZIzj0EAwIDSAAwRQIhAJLZ9g45g4+cLbS7P8he5O2kRfr1X8/j7Q5f
cqK0b6WoAiBqV5M5yhH4dD2T0HfG2Z7uY0u7D92tRn5U2R2pILUfrg==
-----END CERTIFICATE-----
`.trim(); // KEEP line breaks intact
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
      clientApp = await startClientTestServer();   // starts on port 7000
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
      jest.useFakeTimers();
      console.log('app initialized successfully');
    } catch (e) {
      console.error('Beforeall failed:', e);
      throw e;
    }
  });

  afterAll(async () => {
    // await app.close();
    await clientApp.close();
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

  it('validate POST client api should have client details in response', async () => {
    console.log('validate POST client api should have client details in response');
    const res = await agent.post(samlLoginApi).send(payload).catch((err: any) => {
      console.error('Supertest Error:', err.res?.text || err);
      throw err;
    });
    console.log('Response from SAML login API:', res.body);
  });

});
