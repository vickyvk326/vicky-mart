import { BadRequestException, Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiExtraModels } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import * as readline from 'node:readline';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { Flows } from 'src/types/scraper';
import { FlowItemDto, FlowsDto, RunFlowMultipartDto, ScrapeOptionsDto, ScraperAction } from './dto/flows.dto';
import { ScraperEngineService } from './scraper-engine/scraper-engine.service';

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
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiExtraModels(FlowsDto, FlowItemDto)
  @ApiBody({ type: RunFlowMultipartDto })
  async runFlow(@Req() req: FastifyRequest, @Query() scrapeOptionsDto: ScrapeOptionsDto) {
    const jobId = randomUUID();

    let urls: string[] = [];
    let flows: FlowItemDto[] | null = null;

    if (req.isMultipart()) {
      const parts = req.parts();
      for await (const part of parts) {
        if (part.type === 'file') {
          const rl = readline.createInterface({
            input: part.file,
            crlfDelay: Infinity,
          });

          const streamedUrls: string[] = [];
          for await (const line of rl) {
            const trimmed = line.trim();
            if (trimmed) {
              streamedUrls.push(trimmed);
            }
          }
          urls = streamedUrls;
        } else {
          if (part.fieldname === 'flows') {
            try {
              const parsed = JSON.parse(part.value as string) as FlowItemDto[];
              flows = parsed;
            } catch (e) {
              throw new BadRequestException('Invalid JSON in flows field');
            }
          } else if (part.fieldname === 'file') {
            if (part.value) {
              try {
                const parsed = JSON.parse(part.value as string) as { urls: string[] };
                urls = parsed.urls;
              } catch (e) {
                throw new BadRequestException('Invalid JSON in urls field');
              }
            }
          }
        }
      }
    } else {
      const body = req.body as (FlowsDto & { urls?: string[] }) | undefined;
      urls = body?.urls || [];
      flows = body?.flows || null;
    }

    if (!flows) {
      throw new BadRequestException('No flows provided');
    }

    const flowsDto = plainToInstance(FlowsDto, { flows });
    const errors = await validate(flowsDto);
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    void this.scraperService.runFlow(scrapeOptionsDto, flowsDto.flows, urls, jobId);

    return { jobId };
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
      const results = await this.scraperService.runFlow(scrapeOptionsDto, testFlows, [], jobId);

      return {
        jobId,
        status: 'SUCCESS',
        message: 'Test flow executed',
        stepsExecuted: results.length,
        results,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(`Test flow failed: ${message}`);
    }
  }
}
