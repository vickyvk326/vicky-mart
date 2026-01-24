import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino/PinoLogger';
import Scraper from 'src/common/helper/WebScraper';
import { Flow, flowResult, Flows } from 'src/types/scraper';
import { BrowserManagerService } from '../browser-manager/browser-manager.service';
import { EventsGateway } from 'src/core/events/events-gateway.service';
import { ScrapeOptionsDto, ScraperAction } from '../dto/flows.dto';
import { JobRepository } from '../repository/job.repository';
import { JobEntity, JobStatus } from '../entity/job.entity';
import { EntityManager } from '@mikro-orm/core';
import fs from 'fs';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import path from 'path';
import JsonArray from 'src/common/helper/JsonArray';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

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

  async handleAction(
    scraper: Scraper,
    flow: Flow,
    urls: string[],
    jobId: string,
    isSubFlow: boolean = false,
  ): Promise<flowResult> {
    let job: JobEntity | { status: JobStatus } = { status: JobStatus.PENDING };
    if (!isSubFlow) {
      job = this.jobRepo.create({
        jobId,
        flow,
        status: JobStatus.PENDING,
      });
      this.em.persist(job);
      await this.em.flush();
    }

    const { action, params } = flow;

    let data: boolean | string | Array<string | null> | object | number | null = null;
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

        case ScraperAction.WAIT_FOR_NETWORK: {
          await scraper.waitForNetworkIdle(params.options?.timeout);
          break;
        }

        case ScraperAction.WAIT_FOR_LOAD: {
          await scraper.waitForFullLoad(params.options?.timeout);
          break;
        }

        case ScraperAction.TAKE_SCREENSHOT: {
          const screenshotBuffer = await scraper.takeScreenshot();
          const fileName = `screenshot-${jobId}-${Date.now()}.png`;
          const filePath = path.join(process.cwd(), 'public', fileName);
          await fs.promises.writeFile(filePath, screenshotBuffer);
          data = `${BASE_URL}/public/${fileName}`;
          this.logAndEmitEvent(jobId, `Screenshot available at ${data}`);
          break;
        }

        case ScraperAction.LOAD_FULL_PAGE: {
          data = await scraper.autoScroll();
          break;
        }

        case ScraperAction.GET_TEXT: {
          if (!params.selector || !params.by) throw new Error('Selector and type are required for click action');
          if (params.isAll) {
            const locators = await scraper.getElements(params.by, params.selector, params.options);
            if (!locators?.length)
              throw new Error(`Elements with selector "${params.selector}" and type "${params.by}" not found`);
            const texts = await scraper.getElementTextAll(locators);
            this.logAndEmitEvent(jobId, `Found ${texts.length} elements`);
            for (let i = 0; i < Math.min(10, texts.length); i++)
              this.logAndEmitEvent(
                jobId,
                `${i + 1}: ${texts[i]?.slice(0, 100) || ''}${(texts[i]?.length || 0) > 100 ? '...' : ''}`,
              );
            if (texts.length > 10) this.logAndEmitEvent(jobId, `and ${texts.length - 10} more.`);
            data = texts;
            break;
          }
          const locator = await scraper.getElement(params.by, params.selector, params.options);
          if (!locator) throw new Error(`Element with selector "${params.selector}" and type "${params.by}" not found`);
          const text = await scraper.getElementText(locator);
          this.logAndEmitEvent(jobId, `Text: ${text?.slice(0, 100) || ''}${(text?.length || 0) > 100 ? '...' : ''}`);
          data = text;
          break;
        }

        case ScraperAction.GET_TABLE: {
          if (!params.selector || !params.by) throw new Error('Selector and type are required for click action');
          const tableData = await scraper.scrapeTable(params.by, params.selector, params.paginationOptions);
          if (tableData.length === 0) throw new Error('No data found');
          const tableJsonArray = new JsonArray(tableData, (message) => this.logAndEmitEvent(jobId, message));
          const fileName = `table-${jobId}-${Date.now()}.csv`;
          const filePath = path.join(process.cwd(), 'public', fileName);
          await tableJsonArray.exportToCsv(filePath);
          data = `${BASE_URL}/public/${fileName}`;
          this.logAndEmitEvent(jobId, `Table available at ${BASE_URL}/public/${fileName}`);
          break;
        }

        case ScraperAction.GET_CARDS: {
          if (!params.selector || !params.by) throw new Error('Selector and type are required for click action');
          if (!params.cardItems) throw new Error('Card items are required for click action');
          const tableData = await scraper.scrapeCards(
            params.selector,
            params.by,
            params.cardItems,
            params.paginationOptions,
          );
          if (tableData.length === 0) throw new Error('No data found');
          const tableJsonArray = new JsonArray(tableData, (message) => this.logAndEmitEvent(jobId, message));
          const fileName = `table-${jobId}-${Date.now()}.csv`;
          const filePath = path.join(process.cwd(), 'public', fileName);
          await tableJsonArray.exportToCsv(filePath);
          data = `${BASE_URL}/public/${fileName}`;
          this.logAndEmitEvent(jobId, `Table available at ${BASE_URL}/public/${fileName}`);
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

        case ScraperAction.EXECUTE_SCRIPT: {
          if (!params.script) throw new Error('Script is required for execute script action');
          data = await scraper.executeScript<string | number | boolean | object>(
            params.script,
            params.arg,
            params.options,
          );
          break;
        }

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

        case ScraperAction.SLEEP: {
          if (!params.value) throw new Error('Value is required for sleep action');
          await new Promise((resolve) => setTimeout(resolve, Number(params.value || '0')));
          break;
        }

        case ScraperAction.PROCESS_MULTIPLE_URLS: {
          if (!urls.length) throw new Error('Urls are required for process multiple urls action');

          if (!params.flows || !params.flows.length)
            throw new Error('Flows are required for processing multiple urls action');

          const runFlowResult: flowResult[] = [];
          for (let urlIndex = 0; urlIndex < urls.length; urlIndex++) {
            const url = urls[urlIndex];
            this.logAndEmitEvent(jobId, `Processing url ${urlIndex + 1}/${urls.length}: ${url}`);

            for (let stepIndex = 0; stepIndex < params.flows.length; stepIndex++) {
              const step = params.flows[stepIndex];
              step.params.url = url;

              this.logAndEmitEvent(jobId, `Processing step ${stepIndex + 1}/${params.flows.length}: ${step.name}`);

              const result = await this.handleAction(scraper, step, [], jobId, true);
              runFlowResult.push(result);

              if (result.status === JobStatus.FAILED) {
                this.logAndEmitEvent(
                  jobId,
                  `Step ${stepIndex + 1}/${params.flows.length} failed for jobId: ${jobId}. Stopping scraping...`,
                );
                break;
              }
            }
            this.logAndEmitEvent(
              jobId,
              `Completed processing url ${urlIndex + 1}/${urls.length}: ${url} for MULTIPLE_URLS jobId: ${jobId}`,
            );
          }

          data = runFlowResult;
          break;
        }

        default: {
          throw new Error(`Unhandled scraper action: ${String(action)}`);
        }
      }

      job.status = JobStatus.COMPLETED;
    } catch (error) {
      data = error instanceof Error ? error.message : String(error) || 'Unknown error';
      this.logAndEmitEvent(jobId, `Error running action: ${flow.name} - ${data}`);
      job.status = JobStatus.FAILED;
    }

    if (!isSubFlow) await this.em.flush();
    return { status: job.status, action, data };
  }

  async runFlow(
    scrapeOptionsDto: ScrapeOptionsDto,
    flows: Flows,
    urls: string[],
    jobId: string,
  ): Promise<flowResult[]> {
    this.logAndEmitEvent(jobId, `Running flow with jobId: ${jobId}`);

    const browserContext = await this.browserManager.createNewContext(); // Create a new browser context
    const scraper = new Scraper(browserContext, (message) => this.logAndEmitEvent(jobId, message)); // Create a new scraper
    await scraper.init(); // Initialize the scraper
    await scraper.blockHeavyResources({
      images: !scrapeOptionsDto.allowImages,
      media: !scrapeOptionsDto.allowMedia,
      fonts: !scrapeOptionsDto.allowFonts,
      stylesheets: !scrapeOptionsDto.allowCss,
    });

    const runFlowResult: flowResult[] = [];
    try {
      let stepCount = 1;
      for (const step of flows) {
        this.logAndEmitEvent(jobId, `Processing step ${stepCount}/${flows.length}: ${step.name}`);

        const result = await this.handleAction(scraper, step, urls, jobId);
        runFlowResult.push(result);

        if (result.status === JobStatus.FAILED) {
          this.logAndEmitEvent(
            jobId,
            `Step ${stepCount}/${flows.length} failed for jobId: ${jobId}. Stopping scraping...`,
          );
          break;
        }
        stepCount++;
      }
    } finally {
      await browserContext.close();
      this.logAndEmitEvent(jobId, `Flow completed for jobId: ${jobId}`);
    }
    return runFlowResult;
  }
}
