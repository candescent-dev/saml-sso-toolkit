import { Test, TestingModule } from '@nestjs/testing';
import { SamlValidatorController } from './samlValidator.controller';
import { SamlValidatorService } from './samlValidator.service';

describe('SamlValidatorController', () => {
  let controller: SamlValidatorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SamlValidatorController],
      providers: [SamlValidatorService],
    }).compile();
    controller = module.get<SamlValidatorController>(SamlValidatorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
