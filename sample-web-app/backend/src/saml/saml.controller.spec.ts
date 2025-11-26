import { Test, TestingModule } from '@nestjs/testing';
import { SamlController } from './saml.controller';
import { SamlService } from './saml.service';

describe('SamlController', () => {
  let controller: SamlController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SamlController],
      providers: [
        {
          provide: SamlService,
          useValue: {
            generateAndSendSamlResponse: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SamlController>(SamlController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
