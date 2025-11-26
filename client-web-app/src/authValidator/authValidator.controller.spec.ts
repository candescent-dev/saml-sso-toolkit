import { Test, TestingModule } from '@nestjs/testing';
import { AuthValidatorController } from './authValidator.controller';
import { AuthValidatorService } from './authValidator.service';

describe('AuthValidatorController', () => {
  let controller: AuthValidatorController;

  const mockAuthValidatorService = {
    authorizeClient: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthValidatorController],
      providers: [
        {
          provide: AuthValidatorService,
          useValue: mockAuthValidatorService,
        },
      ],
    }).compile();
    controller = module.get<AuthValidatorController>(AuthValidatorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
