import { Test, TestingModule } from '@nestjs/testing';
import { JwkController } from './jwk.controller';

describe('JwkController', () => {
  let controller: JwkController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JwkController],
    }).compile();

    controller = module.get<JwkController>(JwkController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
