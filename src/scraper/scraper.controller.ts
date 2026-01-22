import { BadRequestException, Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { FlowsDto, ScrapeOptionsDto, ScraperAction } from './dto/flows.dto';
import { ScraperEngineService } from './scraper-engine/scraper-engine.service';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import { CustomThrottlerGuard } from 'src/core/auth/guards/throttle.guard';
import { Flows } from 'src/types/scraper';

// @UseGuards(JwtAuthGuard, CustomThrottlerGuard)
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
  runFlow(@Query() scrapeOptionsDto: ScrapeOptionsDto, @Body() flowsDto: FlowsDto) {
    const jobId = randomUUID();
    void this.scraperService.runFlow(scrapeOptionsDto, flowsDto.flows, jobId);
    return jobId;
  }

  @Post('run-full-test')
  async runTest(@Query() scrapeOptionsDto: ScrapeOptionsDto, @Body() body: { targetUrl?: string }) {
    const jobId = randomUUID();
    const url = body?.targetUrl || 'https://news.ycombinator.com';

    // Construct a multi-step flow to test different Action Handlers
    const testFlows: Flows = [
      {
        name: 'Navigate to Site',
        action: ScraperAction.NAVIGATE,
        params: { url },
      },
      {
        name: 'Wait for Content',
        action: ScraperAction.WAIT_FOR_ELEMENT,
        params: {
          by: 'css',
          selector: '.hnname',
          options: { timeout: 5000 },
        },
      },
      {
        name: 'Capture Page Proof',
        action: ScraperAction.TAKE_SCREENSHOT,
        params: {},
      },
      {
        name: 'Extract Table Data',
        action: ScraperAction.GET_TABLE,
        params: {
          by: 'css',
          selector: 'table.itemlist',
          paginationOptions: { timeout: 5000 },
        },
      },
      {
        name: 'Test Native Script',
        action: ScraperAction.EXECUTE_SCRIPT,
        params: {
          script: '() => { return { title: document.title, url: window.location.href }; }',
        },
      },
    ];

    try {
      const results = await this.scraperService.runFlow(scrapeOptionsDto, testFlows, jobId);
      return {
        jobId,
        message: 'Test flow executed',
        stepsExecuted: results.length,
        results,
      };
    } catch (error) {
      throw new BadRequestException(`Test flow failed: ${error.message || error}`);
    }
  }
}
