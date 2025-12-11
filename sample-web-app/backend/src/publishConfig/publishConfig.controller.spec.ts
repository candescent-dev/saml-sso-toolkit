import { Test, TestingModule } from '@nestjs/testing';
import { PublishConfigController } from './publishConfig.controller';
import { PublishConfigService } from './publishConfig.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('PublishConfigController', () => {
  let controller: PublishConfigController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublishConfigController],
      providers: [
        PublishConfigService,
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();
    controller = module.get<PublishConfigController>(PublishConfigController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
