import { Test, TestingModule } from '@nestjs/testing';
import { SamlValidatorService } from './samlValidator.service';

describe('SamlValidatorService', () => {
  let service: SamlValidatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SamlValidatorService],
    }).compile();
    service = module.get<SamlValidatorService>(SamlValidatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
