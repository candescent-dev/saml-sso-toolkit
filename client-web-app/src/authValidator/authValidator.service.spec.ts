import { Test, TestingModule } from '@nestjs/testing';
import { AuthValidatorService } from './authValidator.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';

describe('AuthValidatorService', () => {
  let service: AuthValidatorService;

  const mockHttpService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [
        AuthValidatorService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'backendPort') return 9000;
              return null;
            }),
          },
        },
      ],
    }).compile();
    service = module.get<AuthValidatorService>(AuthValidatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
