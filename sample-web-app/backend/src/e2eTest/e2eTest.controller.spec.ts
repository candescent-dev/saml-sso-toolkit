import { Test, TestingModule } from '@nestjs/testing';
import { E2ETestController } from './e2eTest.controller';
import { E2ETestService } from './e2eTest.service';

describe('E2ETestController', () => {
  let controller: E2ETestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [E2ETestController],
      providers: [E2ETestService],
    }).compile();
    controller = module.get<E2ETestController>(E2ETestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
