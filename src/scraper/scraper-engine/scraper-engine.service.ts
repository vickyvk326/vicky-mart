import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino/PinoLogger';
import Scraper from 'src/common/helper/WebScraper';
import { Flow, flowResult, Flows } from 'src/types/scraper';
import { BrowserManagerService } from '../browser-manager/browser-manager.service';
import { EventsGateway } from 'src/core/events/events-gateway.service';
import { ScraperAction } from '../dto/flows.dto';
import { JobRepository } from '../repository/job.repository';
import { JobStatus } from '../entity/job.entity';
import { EntityManager } from '@mikro-orm/core';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class ScraperEngineService {
  constructor(
    private readonly browserManager: BrowserManagerService,
    private readonly jobRepo: JobRepository,
    private readonly em: EntityManager,
    private readonly eventsGateway: EventsGateway,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ScraperEngineService.name);
  }

  private logAndEmitEvent(jobId: string, message: string) {
    this.logger.info(message);
    this.eventsGateway.sendMessageToRoom(jobId, message);
  }
  getScraperActions() {
    return ScraperAction;
  }

  getFlows(pagination: PaginationDto) {
    return this.jobRepo.findAllWithPagination(pagination);
  }

  async handleAction(scraper: Scraper, flow: Flow, jobId: string): Promise<flowResult> {
    this.logAndEmitEvent(jobId, `Running action: ${flow.name} (${flow.action})`);

    const job = this.jobRepo.create({
      jobId,
      flow: JSON.stringify(flow),
      status: JobStatus.PENDING,
    });
    this.em.persist(job);
    await this.em.flush();

    const { action, params } = flow;

    let data: any;
    try {
      switch (action) {
        case ScraperAction.NAVIGATE:
          if (!params.url) throw new Error('URL is required for navigation action');
          await scraper.navigate(params.url, params.options);
          break;

        case ScraperAction.CLICK: {
          if (!params.selector || !params.by) throw new Error('Selector and type are required for click action');
          const locator = await scraper.getElement(params.by, params.selector, params.options);
          if (!locator) throw new Error(`Element with selector "${params.selector}" and type "${params.by}" not found`);
          await scraper.clickElement(locator, params?.options?.scrollIntoElement);
          break;
        }
        case ScraperAction.INPUT: {
          if (!params.selector || !params.by || !params.value)
            throw new Error('Selector, type and value are required for input action');
          const locator = await scraper.getElement(params.by, params.selector, params.options);
          if (!locator) throw new Error(`Element with selector "${params.selector}" and type "${params.by}" not found`);
          await scraper.input(locator, params.value);
          break;
        }
        case ScraperAction.WAIT_FOR_ELEMENT: {
          if (!params.selector || !params.by) throw new Error('Selector and type are required for click action');
          await scraper.waitForElement(params.selector, params.options?.timeout);
          break;
        }
        case ScraperAction.WAIT_FOR_NETWORK:
          await scraper.waitForNetworkIdle(params.options?.timeout);
          break;

        case ScraperAction.GET_TEXT: {
          if (!params.selector || !params.by) throw new Error('Selector and type are required for click action');
          const locator = await scraper.getElement(params.by, params.selector, params.options);
          if (!locator) throw new Error(`Element with selector "${params.selector}" and type "${params.by}" not found`);
          data = await scraper.getElementText(locator);
          break;
        }

        case ScraperAction.GET_ATTRIBUTE: {
          if (!params.selector || !params.by || !params.attribute)
            throw new Error('Selector, type and attribute are required for click action');
          const locator = await scraper.getElement(params.by, params.selector, params.options);
          if (!locator) throw new Error(`Element with selector "${params.selector}" and type "${params.by}" not found`);
          data = await scraper.getElementAttribute(locator, params.attribute);
          break;
        }

        case ScraperAction.SCROLL: {
          if (!params.selector || !params.by) throw new Error('Selector and type are required for click action');
          const locator = await scraper.getElement(params.by, params.selector, params.options);
          if (!locator) throw new Error(`Element with selector "${params.selector}" and type "${params.by}" not found`);
          await scraper.scrollIntoElement(locator, params.options);
          break;
        }

        case ScraperAction.EXECUTE_SCRIPT:
          if (!params.script) throw new Error('Script is required for execute script action');
          data = await scraper.executeScript<string | number | boolean | object>(
            params.script,
            params.arg,
            params.options,
          );
          break;

        case ScraperAction.HTTP_GET: {
          if (!params.url) throw new Error('URL is required for HTTP GET action');
          const getRes = await scraper.get(params.url, params.options);
          try {
            data = (await getRes.json()) as Record<string, any>;
          } catch (error) {
            data = await getRes.text();
          }
          break;
        }

        case ScraperAction.HTTP_POST: {
          if (!params.url || !params.data) throw new Error('URL and data are required for HTTP POST action');
          const postRes = await scraper.post(params.url, params.data, params.options);
          try {
            data = (await postRes.json()) as Record<string, any>;
          } catch (error) {
            data = await postRes.text();
          }
          break;
        }

        default: {
          throw new Error(`Unhandled scraper action: ${action}`);
        }
      }

      job.status = JobStatus.COMPLETED;
    } catch (error) {
      this.logAndEmitEvent(jobId, `Error running action: ${flow.name} - ${error?.message}`);
      data = String(error?.message || error || 'Unknown error');
      job.status = JobStatus.FAILED;
    }

    await this.em.flush();
    return { status: job.status, data };
  }

  async runFlow(flows: Flows, jobId: string): Promise<flowResult[]> {
    this.logAndEmitEvent(jobId, `Running flow with jobId: ${jobId}`);

    const browserContext = await this.browserManager.createNewContext();

    const page = await browserContext.newPage();

    const apiContext = browserContext.request;

    await page.setViewportSize({ width: 1280, height: 720 });

    const scraper = new Scraper(page, apiContext, (message) => this.logAndEmitEvent(jobId, message));

    const runFlowResult: flowResult[] = [];
    try {
      for (const step of flows) {
        const result = await this.handleAction(scraper, step, jobId);
        runFlowResult.push(result);
        if (result.status === JobStatus.FAILED) break;
      }
    } finally {
      await browserContext.close();
      this.logAndEmitEvent(jobId, `Flow completed for jobId: ${jobId}`);
    }
    return runFlowResult;
  }
}
