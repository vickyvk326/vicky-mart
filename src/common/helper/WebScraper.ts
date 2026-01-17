import { APIRequestContext, APIResponse, Locator, Page } from 'playwright';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ElementSelectorType = 'css' | 'xpath' | 'text' | 'id';

export type RequestOptions = {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  data?: any;
  timeout?: number;
  retries?: number;
};

class Scraper {
  private readonly page: Page;
  private readonly apiContext: APIRequestContext;
  private readonly logger: (message: string) => void;

  constructor(page: Page, apiContext: APIRequestContext, logger: (message: string) => void) {
    this.page = page;
    this.apiContext = apiContext;
    this.logger = logger;
    this.logger('Scraper initialized');
  }

  async navigate(
    url: string,
    options: {
      waitForFullLoad?: boolean;
      timeout?: number;
      maxRetries?: number;
      waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
      referer?: string;
    } = {},
  ): Promise<boolean> {
    const targetUrl = url.startsWith('http') ? url : `https://${url}`;

    const { waitForFullLoad = false, timeout = 30000, maxRetries = 2, waitUntil = 'load', referer } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await this.page.goto(targetUrl, { timeout, waitUntil, referer });
        if (waitForFullLoad) await this.waitForFullLoad(timeout);
        this.logger(`Navigated to ${targetUrl}`);
        return true;
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          const delay = 2000 * (attempt + 1); // Exponential backoff
          this.logger(`[WARNING] Navigation attempt ${attempt + 1} failed. Retrying in ${delay}ms...\n${error}`);
          try {
            await this.page?.reload();
          } catch {
            this.logger('[WARNING] Failed to reload page');
          }
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          return false;
        }
      }
    }

    throw new Error(`Failed to navigate to ${url} after ${maxRetries} retries. Last error: ${lastError?.message}`);
  }

  async takeScreenshot(path: string): Promise<void> {
    await this.page.screenshot({ path, fullPage: true, type: 'png' });
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
    const locator = parentLocator.locator('text=' + text);
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
    const locator = parentLocator.locator('text=' + text);
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
    this.logger(`Got element text: ${text?.slice(0, 100)}${text?.length && text.length > 100 ? '...' : ''}`);
    return text;
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
}

export default Scraper;
