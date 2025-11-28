import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { APP_CONFIG } from '../src/appConfig/appConfig.provider';

describe('SAML backend testcases (e2e)', () => {
  let app: INestApplication;
  let agent: any;

  const samlLoginApi = 'saml/login';

  beforeEach(async () => {
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
      jest.useFakeTimers();
      console.log('app initialized successfully');
    } catch (e) {
      console.error('Beforeall failed:', e);
      throw e;
    }
  });

   afterAll(async () => {
    // await app.close();
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
    const res = await agent.post(samlLoginApi).catch((err: any) => {
      console.error('Supertest Error:', err.res?.text || err);
      throw err;
    });
  });

});
