import { Test, TestingModule } from '@nestjs/testing';
import { PublicKeyService } from './publicKey.service';

describe('AuthValidatorService', () => {
  let service: PublicKeyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PublicKeyService],
    }).compile();
    service = module.get<PublicKeyService>(PublicKeyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
