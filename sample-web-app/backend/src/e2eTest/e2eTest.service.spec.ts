import { Test, TestingModule } from '@nestjs/testing';
import { E2ETestService } from './e2eTest.service';

describe('E2ETestService', () => {
  let service: E2ETestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [E2ETestService],
    }).compile();
    service = module.get<E2ETestService>(E2ETestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
