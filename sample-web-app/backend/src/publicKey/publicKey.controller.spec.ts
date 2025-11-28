import { Test, TestingModule } from '@nestjs/testing';
import { PublicKeyController } from './publicKey.controller';
import { PublicKeyService } from './publicKey.service';

describe('PublicKeyController', () => {
  let controller: PublicKeyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicKeyController],
      providers: [PublicKeyService],
    }).compile();
    controller = module.get<PublicKeyController>(PublicKeyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
