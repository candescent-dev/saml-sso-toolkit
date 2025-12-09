import { Test, TestingModule } from '@nestjs/testing';
import { PublishConfigService } from './publishConfig.service';

describe('PublishConfigService', () => {
  let service: PublishConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PublishConfigService],
    }).compile();
    service = module.get<PublishConfigService>(PublishConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
