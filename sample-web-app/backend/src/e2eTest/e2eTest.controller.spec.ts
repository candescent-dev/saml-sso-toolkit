import { Test, TestingModule } from '@nestjs/testing';
import { E2ETestController } from './e2eTest.controller';
import { E2ETestService } from './e2eTest.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('E2ETestController', () => {
  let controller: E2ETestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [E2ETestController],
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
    controller = module.get<E2ETestController>(E2ETestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
