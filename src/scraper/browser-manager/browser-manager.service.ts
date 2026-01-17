import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { chromium, Browser, BrowserContext } from 'playwright';

@Injectable()
export class BrowserManagerService implements OnModuleInit, OnModuleDestroy {
  private browser: Browser;

  async onModuleInit() {
    this.browser = await chromium.launch({ headless: false });
  }

  async createNewContext(): Promise<BrowserContext> {
    return await this.browser.newContext();
  }

  async onModuleDestroy() {
    await this.browser.close();
  }
}
