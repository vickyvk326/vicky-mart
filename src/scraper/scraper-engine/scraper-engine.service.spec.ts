import { Test, TestingModule } from '@nestjs/testing';
import { ScraperEngineService } from './scraper-engine.service';

describe('ScraperEngineService', () => {
  let service: ScraperEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScraperEngineService],
    }).compile();

    service = module.get<ScraperEngineService>(ScraperEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
