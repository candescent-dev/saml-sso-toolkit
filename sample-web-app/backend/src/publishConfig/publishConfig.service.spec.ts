import { Test, TestingModule } from '@nestjs/testing';
import { PublishConfigService } from './publishConfig.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('PublishConfigService', () => {
  let service: PublishConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublishConfigService,
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
    service = module.get<PublishConfigService>(PublishConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
