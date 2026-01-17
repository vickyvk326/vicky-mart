import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { FlowsDto } from './dto/flows.dto';
import { ScraperEngineService } from './scraper-engine/scraper-engine.service';

@Controller('scrapers')
export class ScraperController {
  constructor(private readonly scraperService: ScraperEngineService) {}

  @Get('getScraperActions')
  getScraperActions() {
    return this.scraperService.getScraperActions();
  }

  @Get('getFlows')
  async getAllFlows(@Query() pagination: PaginationDto) {
    return await this.scraperService.getFlows(pagination);
  }

  @Post('run')
  runFlow(@Body() flowsDto: FlowsDto) {
    const jobId = randomUUID();
    void this.scraperService.runFlow(flowsDto.flows, jobId);
    return jobId;
  }
}
