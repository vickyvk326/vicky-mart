import { APIRequestContext, APIResponse, BrowserContext, Locator, Page } from 'playwright';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ElementSelectorType = 'css' | 'xpath' | 'text' | 'id';

export type NavigationOptionsType = {
  waitForFullLoad?: boolean;
  timeout?: number;
  maxRetries?: number;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  referer?: string;
};

export type BlockHeavyResourcesOptionsType = {
  images?: boolean;
  media?: boolean;
  fonts?: boolean;
  stylesheets?: boolean;
};

export type RequestOptions = {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  data?: any;
  timeout?: number;
  retries?: number;
};
export type PaginationOptionsType = {
  nextBtnBy?: ElementSelectorType;
  nextBtnValue?: string;
  maxPages?: number;
  timeout?: number;
  from?: Locator;
};

export type CardDefType = {
  name: string;
  selector: string;
  type: ElementSelectorType;
};

class Scraper {
  private readonly browserContext: BrowserContext;
  private page: Page;
  private apiContext: APIRequestContext;
  private readonly logger: (message: string) => void;

  constructor(browserContext: BrowserContext, logger: (message: string) => void) {
    this.browserContext = browserContext;
    this.logger = logger;
  }

  async init() {
    const page = await this.browserContext.newPage();
    this.page = page;
    const apiContext = this.browserContext.request;
    this.apiContext = apiContext;
    this.logger('Scraper initialized');
  }

  async blockHeavyResources(
    options: BlockHeavyResourcesOptionsType = { images: true, media: true, fonts: true, stylesheets: false },
  ): Promise<void> {
    this.logger('Setting up resource blocking...');

    await this.page.route('**/*', async (route) => {
      const url = route.request().url();
      const type = route.request().resourceType();

      // 1. Check for blocked domains (Ads/Analytics)
      const isAdOrAnalytics =
        url.includes('google-analytics.com') || url.includes('doubleclick.net') || url.includes('facebook.net');

      // 2. Check for blocked resource types
      const isBlockedType =
        (options.images && type === 'image') ||
        (options.media && type === 'media') ||
        (options.fonts && type === 'font') ||
        (options.stylesheets && type === 'stylesheet');

      if (isAdOrAnalytics || isBlockedType) {
        return route.abort();
      }

      return route.continue();
    });
  }

  async navigate(url: string, options: NavigationOptionsType = {}): Promise<boolean> {
    const targetUrl = url.startsWith('http') ? url : `https://${url}`;

    const { waitForFullLoad = false, timeout = 30000, maxRetries = 2, waitUntil = 'load', referer } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.page.goto(targetUrl, {
          timeout,
          waitUntil: waitForFullLoad ? 'networkidle' : waitUntil,
          referer,
        });

        if (response && response.status() >= 400) {
          throw new Error(`HTTP ${response.status()}`);
        }

        this.logger(`Navigated to ${targetUrl}`);
        return true;
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          const delay = 2000 * (attempt + 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          throw new Error(
            `Failed to navigate to ${url} after ${maxRetries} retries. Last error: ${lastError?.message}`,
          );
        }
      }
    }
    return false;
  }

  async downloadFile(
    triggerAction: () => Promise<void>,
    savePath?: string,
  ): Promise<{ path: string; filename: string }> {
    this.logger('Waiting for download to start...');

    try {
      // 1. Start listening and trigger the action simultaneously
      const [download] = await Promise.all([
        this.page.waitForEvent('download', { timeout: 60000 }), // Wait up to 1 minute
        triggerAction(),
      ]);

      const filename = download.suggestedFilename();
      const finalPath = savePath || `./downloads/${filename}`;

      // 2. Save the file to your desired location
      await download.saveAs(finalPath);
      this.logger(`File downloaded successfully: ${filename}`);

      return { path: finalPath, filename };
    } catch (error) {
      this.logger(`[ERROR] Download failed: ${error.message}`);
      throw error;
    }
  }

  async takeScreenshot(path?: string): Promise<Buffer> {
    // screenshotBuffer.toString('base64')
    return await this.page.screenshot({
      path,
      fullPage: true,
      type: 'png',
      animations: 'disabled', // This often prevents the font-loading hang
      timeout: 15000, // Reduce timeout so it fails faster if there's a real issue
    });
  }

  async waitForFullLoad(timeout = 60000): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    // Combined wait conditions
    await Promise.all([
      this.page.waitForLoadState('domcontentloaded', { timeout }),
      this.page.waitForLoadState('networkidle', { timeout }),
      this.page.waitForFunction(() => document.readyState === 'complete', { timeout }),
    ]).catch(() => {
      // Individual failures are acceptable if others succeed
    });

    // Final check
    await this.page.waitForSelector('body', {
      state: 'attached',
      timeout,
    });
  }

  async waitForElement(selector: string, timeout: number = 15000): Promise<Locator> {
    const element = this.page.locator(selector);
    await element.waitFor({ state: 'visible', timeout });
    return element;
  }

  async waitForXPath(xpath: string, timeout: number = 15000): Promise<Locator> {
    const element = this.page.locator(`xpath=${xpath}`);
    await element.waitFor({ state: 'visible', timeout });
    return element;
  }

  async waitForNetworkIdle(timeout: number = 15000): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout });
  }

  async clickElement(element: Locator, scrollIntoElement: boolean = true): Promise<boolean> {
    try {
      if (scrollIntoElement) await this.scrollIntoElement(element);
      await element.click();
      this.logger(`Clicked the element.`);
      return true;
    } catch (error) {
      this.logger(`There was an error while clicking the element.`);
      return false;
    }
  }

  async autoScroll(maxScrolls: number = 10, delayMs: number = 1000): Promise<number> {
    this.logger(`Starting auto-scroll (max: ${maxScrolls})...`);
    let previousHeight: number = 0;
    for (let i = 0; i < maxScrolls; i++) {
      const currentHeight: number = await this.page.evaluate('document.body.scrollHeight');
      if (currentHeight === previousHeight) break;

      await this.page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      previousHeight = currentHeight;
    }
    this.logger(`Auto-scroll completed. Final height: ${previousHeight}`);
    return previousHeight;
  }

  async scrollIntoElement(
    selector: string | Locator,
    options: {
      selectorType?: 'css' | 'xpath';
      behavior?: 'auto' | 'smooth';
      block?: 'start' | 'center' | 'end' | 'nearest';
      inline?: 'start' | 'center' | 'end' | 'nearest';
      timeout?: number;
      maxRetries?: number;
      waitFor?: 'attached' | 'visible';
      offset?: { x?: number; y?: number };
    } = {},
  ): Promise<boolean> {
    this.logger('Scrolling into element...');
    const {
      selectorType = 'css',
      behavior = 'smooth',
      block = 'center',
      inline = 'nearest',
      timeout = 5000,
      maxRetries = 2,
      waitFor = 'visible',
      offset = { x: 0, y: 0 },
    } = options;

    // Handle both string selectors and Locator objects
    const locator =
      typeof selector === 'string'
        ? this.page.locator(selectorType === 'xpath' ? `xpath=${selector}` : selector).first()
        : selector;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await locator.waitFor({
          state: waitFor,
          timeout,
        });

        // Scroll into view with optional offset
        await locator.evaluate(
          (element, scrollOptions) => {
            // First do standard scrollIntoView
            element.scrollIntoView({
              behavior: scrollOptions.behavior,
              block: scrollOptions.block,
              inline: scrollOptions.inline,
            });

            // Then apply manual offset if needed
            if (scrollOptions.offset.x !== 0 || scrollOptions.offset.y !== 0) {
              const rect = element.getBoundingClientRect();
              window.scrollBy({
                left: scrollOptions.offset.x,
                top: scrollOptions.offset.y || 0 + rect.height, // Account for element height
                behavior: scrollOptions.behavior,
              });
            }
          },
          { behavior, block, inline, offset },
        );

        await locator.scrollIntoViewIfNeeded({ timeout });
        return true;
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries) {
          const delay = 1000 * (attempt + 1);
          this.logger(`[WARNING] Scroll attempt ${attempt + 1} failed. Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    this.logger(`[Error] Failed to scroll to element after ${maxRetries} attempts: ${lastError?.message}`);
    return false;
  }

  async moveMouseHumanly(selector: string): Promise<void> {
    const element = this.page.locator(selector);
    const box = await element.boundingBox();
    if (box) {
      // Move to a random point inside the element
      await this.page.mouse.move(
        box.x + Math.random() * box.width,
        box.y + Math.random() * box.height,
        { steps: 10 }, // Higher steps = smoother movement
      );
    }
  }

  async getElementByCss(
    cssSelector: string,
    options: {
      timeout?: number;
      throwOnNotFound?: boolean;
      waitFor?: 'attached' | 'visible' | 'hidden';
      from?: Locator;
    } = {},
  ): Promise<Locator | null> {
    const { timeout = 5000, throwOnNotFound = false, waitFor = 'attached', from = this.page } = options;

    try {
      const locator = from.locator(cssSelector).first();
      await locator.waitFor({
        state: waitFor,
        timeout,
      });
      return locator;
    } catch (error) {
      if (throwOnNotFound) {
        throw new Error(`Element with CSS selector "${cssSelector}" not found within ${timeout}ms`);
      }
      return null;
    }
  }

  async getElementByXPath(
    xpath: string,
    options: {
      timeout?: number;
      throwOnNotFound?: boolean;
      waitFor?: 'attached' | 'visible' | 'hidden';
      from?: Locator;
    } = {},
  ): Promise<Locator | null> {
    const { timeout = 5000, throwOnNotFound = false, waitFor = 'attached', from = this.page } = options;

    try {
      const locator = from.locator(`xpath=${xpath}`).first();
      await locator.waitFor({
        state: waitFor,
        timeout,
      });
      return locator;
    } catch (error) {
      if (throwOnNotFound) {
        throw new Error(`Element with XPath "${xpath}" not found within ${timeout}ms`);
      }
      return null;
    }
  }

  async getElementByText(text: string, options?: { timeout?: number; from?: Locator }): Promise<Locator | null> {
    const parentLocator = options?.from ?? this.page;
    const locator = parentLocator.getByText(text, { exact: false });
    await locator.first()?.waitFor({ state: 'attached', timeout: options?.timeout ?? 5000 });
    return locator.first();
  }

  async getElement(
    by: ElementSelectorType,
    value: string,
    options?: { timeout?: number; from?: Locator },
  ): Promise<Locator | null> {
    if (by === 'css') return this.getElementByCss(value, options);
    if (by === 'xpath') return this.getElementByXPath(value, options);
    if (by === 'text') return this.getElementByText(value, options);
    if (by === 'id') return this.getElementByCss(`#${value}`, options);
    throw new Error('Invalid element selector type');
  }

  async scrapeCards<T = Record<string, string>>(
    containerSelector: string,
    containerSelectorType: ElementSelectorType,
    cardItems: CardDefType[],
    options: PaginationOptionsType = {},
  ): Promise<T[]> {
    if (!cardItems.length) return [];

    const { nextBtnBy, nextBtnValue, maxPages = 5, timeout = 10000, from } = options;

    const allResults: T[] = [];
    let currentPage = 1;

    while (currentPage <= maxPages) {
      this.logger(`Processing page ${currentPage}...`);

      const cards = await this.getElements(containerSelectorType, containerSelector, { from });
      if (!cards?.length) break;

      for (const card of cards) {
        const row: Record<string, string> = {};
        for (const item of cardItems) {
          const element = card.locator(item.selector).first();
          const text = (await element.isVisible()) ? await element.innerText() : null;
          row[item.name] = text?.trim() ?? '';
        }
        allResults.push(row as T);
      }

      if (nextBtnBy && nextBtnValue && currentPage < maxPages) {
        const nextButton = await this.getElement(nextBtnBy, nextBtnValue, { timeout });

        if (nextButton && (await nextButton.isVisible())) {
          this.logger(`Navigating to next page (${currentPage + 1})...`);

          await Promise.all([this.page.waitForLoadState('networkidle', { timeout }), nextButton.click()]);

          currentPage++;
          // Anti-bot "Jitter" delay
          await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000));
        } else {
          this.logger('No more pages found via pagination.');
          break;
        }
      } else {
        // If no pagination params or maxPages reached, exit the loop
        break;
      }
    }

    this.logger(`Extraction complete. Total records: ${allResults.length}`);
    return allResults;
  }

  async scrapeTable<T = Record<string, string>>(
    tableBy: ElementSelectorType,
    tableValue: string,
    options: PaginationOptionsType = {},
  ): Promise<T[]> {
    const { nextBtnBy, nextBtnValue, maxPages = 1, timeout = 10000, from } = options;

    const allResults: T[] = [];
    let currentPage = 1;

    while (currentPage <= maxPages) {
      this.logger(`Processing page ${currentPage}...`);

      // 1. Find the Table
      const table = await this.getElement(tableBy, tableValue, { timeout, from });
      if (!table) {
        this.logger(`[WARNING] Table not found on page ${currentPage}.`);
        break;
      }

      // 2. Extract Data from current Table
      const headers = (await table.locator('thead th, th').allTextContents())
        .map((h) => h.trim())
        .filter((h) => h !== '');

      const rows = await table.locator('tbody tr, tr').all();

      for (const row of rows) {
        const cells = await row.locator('td').allTextContents();
        if (cells.length === 0 || cells.every((c) => c.trim() === '')) continue;

        const rowObject: Record<string, string> = {};
        headers.forEach((header, index) => {
          rowObject[header] = cells[index]?.trim() || '';
        });
        allResults.push(rowObject as T);
      }

      // 3. Check for Pagination (Only if nextBtnBy and nextBtnValue are provided)
      if (nextBtnBy && nextBtnValue && currentPage < maxPages) {
        const nextButton = await this.getElement(nextBtnBy, nextBtnValue, { timeout });

        if (nextButton && (await nextButton.isVisible())) {
          this.logger(`Navigating to next page (${currentPage + 1})...`);

          await Promise.all([this.page.waitForLoadState('networkidle', { timeout }), nextButton.click()]);

          currentPage++;
          // Anti-bot "Jitter" delay
          await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000));
        } else {
          this.logger('No more pages found via pagination.');
          break;
        }
      } else {
        // If no pagination params or maxPages reached, exit the loop
        break;
      }
    }

    this.logger(`Extraction complete. Total records: ${allResults.length}`);
    return allResults;
  }

  async getElementsByCss(cssSelector: string, options?: { timeout?: number; from?: Locator }): Promise<Locator[]> {
    const parentLocator = options?.from ?? this.page;

    try {
      const locator = parentLocator.locator(cssSelector);
      await locator.first()?.waitFor({
        state: 'attached',
        timeout: options?.timeout ?? 5000,
      });
      return locator.all();
    } catch (error) {
      return []; // Return empty array if no elements found
    }
  }

  async getElementsByXPath(xpath: string, options?: { timeout?: number; from?: Locator }): Promise<Locator[]> {
    const parentLocator = options?.from ?? this.page;

    try {
      const locator = parentLocator.locator(`xpath=${xpath}`);
      await locator.first()?.waitFor({
        state: 'attached',
        timeout: options?.timeout ?? 5000,
      });
      return locator.all();
    } catch (error) {
      return []; // Return empty array if no elements found
    }
  }

  async getElementsByText(text: string, options?: { timeout?: number; from?: Locator }): Promise<Locator[]> {
    const parentLocator = options?.from ?? this.page;
    const locator = parentLocator.getByText(text, { exact: false });
    await locator.first()?.waitFor({ state: 'attached', timeout: options?.timeout ?? 5000 });
    return locator.all();
  }

  async getElements(
    by: ElementSelectorType,
    value: string,
    options?: { timeout?: number; from?: Locator },
  ): Promise<Locator[] | null> {
    if (by === 'css') return this.getElementsByCss(value, options);
    if (by === 'xpath') return this.getElementsByXPath(value, options);
    if (by === 'text') return this.getElementsByText(value, options);
    if (by === 'id') return this.getElementsByCss(`#${value}`, options);
    throw new Error('Invalid element selector type');
  }

  async getElementText(element: Locator | null): Promise<string | null> {
    if (!element) return null;
    const text = (await element.textContent())?.trim() || null;
    return text;
  }

  async getElementTextAll(elements: Locator[] | null): Promise<Array<string | null>> {
    if (!elements?.length) return [];
    const texts = await Promise.all(elements.map((e) => this.getElementText(e)));
    return texts;
  }

  async getElementAttribute(element: Locator, attribute: string): Promise<string | null> {
    if (!element) return null;
    return (await element.getAttribute(attribute))?.trim() || null;
  }

  async input(element: Locator | null, keys: string): Promise<void> {
    if (!element) return;
    await element.fill(keys);
  }

  async executeScript<T = any>(
    script: string | ((arg: any) => T),
    arg?: any,
    options: {
      timeout?: number;
      returnByValue?: boolean;
      awaitPromise?: boolean;
    } = {},
  ): Promise<T> {
    const { timeout = 30000, returnByValue = true, awaitPromise = true } = options;

    try {
      // Handle both string and function input
      const scriptToExecute = typeof script === 'function' ? `(${script.toString()})(${JSON.stringify(arg)})` : script;

      const result = await this.page.evaluateHandle(
        async ({ script, arg }) => {
          try {
            return await new Function('arg', script)(arg);
          } catch (error) {
            console.error('Script execution error:', error);
            throw error;
          }
        },
        { script: scriptToExecute, arg, timeout },
      );

      // Return primitive values directly
      if (returnByValue) {
        const value = await result.jsonValue();
        await result.dispose();
        return value as T;
      }

      return result as T;
    } catch (error) {
      throw new Error(`Script execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async fetchWithRetry(method: HttpMethod, url: string, options: RequestOptions): Promise<APIResponse> {
    const maxRetries = options.retries ?? 3; // Default 3 retries
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.apiContext.fetch(url, {
          method,
          headers: options.headers,
          params: options.params,
          data: options.data,
          timeout: options.timeout || 30000,
          failOnStatusCode: true,
        });

        return response;
      } catch (error) {
        lastError = error as Error;

        // Exponential backoff (1000ms, 2000ms, 4000ms)
        if (attempt < maxRetries) {
          this.logger(`[WARNING] Attempt ${attempt + 1} failed: ${lastError.message}. Retrying...`);
          const delayMs = 1000 * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    throw new Error(`Request failed after ${maxRetries} retries: ${lastError?.message}`);
  }

  async get(url: string, options: Omit<RequestOptions, 'data'> = {}): Promise<APIResponse> {
    return this.fetchWithRetry('GET', url, options);
  }

  async post(url: string, data: any, options: RequestOptions = {}): Promise<APIResponse> {
    return this.fetchWithRetry('POST', url, { ...options, data });
  }

  async waitForApiResponse<T>(urlPattern: string | RegExp, action: () => Promise<void>): Promise<T> {
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (res) =>
          (typeof urlPattern === 'string' ? res.url().includes(urlPattern) : urlPattern.test(res.url())) &&
          res.status() === 200,
      ),
      action(),
    ]);
    return response.json() as Promise<T>;
  }
}

export default Scraper;
