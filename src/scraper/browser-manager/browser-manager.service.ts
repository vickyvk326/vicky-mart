import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Browser, BrowserContext } from 'playwright';
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

@Injectable()
export class BrowserManagerService implements OnModuleInit, OnModuleDestroy {
  private browser: Browser;

  async onModuleInit() {
    // 1. Initialize Stealth
    chromium.use(StealthPlugin());

    // 2. Launch with "Human-Like" arguments
    this.browser = await chromium.launch({
      headless: false, // Keeping it 'headed' is the best anti-bot defense
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--window-size=1920,1080',
        '--enable-webgl',
        '--use-gl=swiftshader', // Stable WebGL rendering
        '--enforce-webrtc-ip-permission-check',
        '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
      ],
    });
  }

  async createNewContext(): Promise<BrowserContext> {
    // 3. Dynamic Emulation instead of hard-coded UA
    return await this.browser.newContext({
      deviceScaleFactor: 1,
      hasTouch: false,
      locale: 'en-US',
      timezoneId: 'America/New_York',
    });
  }

  async onModuleDestroy() {
    if (this.browser) await this.browser.close();
  }
}
