import { Test, TestingModule } from '@nestjs/testing';
import { BrowserManagerService } from './browser-manager.service';

describe('BrowserManagerService', () => {
  let service: BrowserManagerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BrowserManagerService],
    }).compile();

    service = module.get<BrowserManagerService>(BrowserManagerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
