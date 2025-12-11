import { Test, TestingModule } from '@nestjs/testing';
import { E2ETestService } from './e2eTest.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('E2ETestService', () => {
  let service: E2ETestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        E2ETestService,
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          }, // simple mock for cache manager
        },
      ],
    }).compile();
    service = module.get<E2ETestService>(E2ETestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
