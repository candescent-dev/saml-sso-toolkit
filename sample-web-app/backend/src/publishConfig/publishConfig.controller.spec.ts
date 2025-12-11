import { Test, TestingModule } from '@nestjs/testing';
import { PublishConfigController } from './publishConfig.controller';
import { PublishConfigService } from './publishConfig.service';

describe('PublishConfigController', () => {
  let controller: PublishConfigController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublishConfigController],
      providers: [PublishConfigService],
    }).compile();
    controller = module.get<PublishConfigController>(PublishConfigController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
