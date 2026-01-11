import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

@Injectable()
export class BotDetectionGuard implements CanActivate {
  // Common bot keywords found in User-Agent strings
  private readonly botKeywords = [
    'bot',
    'crawl',
    'spider',
    'slurp',
    'headless',
    'puppeteer',
    'selenium',
    'playwright',
    'python-requests',
  ];

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const headers = request.headers;
    const userAgent = (headers['user-agent'] || '').toLowerCase();

    // 1. Basic User-Agent Check
    if (this.botKeywords.some((keyword) => userAgent.includes(keyword))) {
      throw new ForbiddenException('Automated access detected (UA).');
    }

    // 2. Fetch Metadata Check (The "Sec-Fetch" fingerprint)
    // Most modern browsers (Chrome, Edge, Safari, Firefox) support these.
    const secFetchSite = headers['sec-fetch-site']; // e.g., 'same-origin', 'cross-site', 'none'
    const secFetchMode = headers['sec-fetch-mode']; // e.g., 'navigate', 'cors'
    const secFetchDest = headers['sec-fetch-dest']; // e.g., 'document', 'empty'

    // If these are missing entirely, it's highly likely a script/curl/old bot
    if (!secFetchSite || !secFetchMode || !secFetchDest) {
      // NOTE: Be careful! Old browsers or specific mobile WebViews might miss these.
      // For a modern API, they are almost always present.
      throw new ForbiddenException('Missing browser metadata headers.');
    }

    // 3. Navigation Inconsistency
    // If a request claims to be a top-level navigation but doesn't have the user-initiated flag
    // Browsers send 'Sec-Fetch-User: ?1' when a user clicks a link or submits a form.
    if (secFetchMode === 'navigate' && !headers['sec-fetch-user']) {
      // Common in headless browsers that haven't been "stealthed"
      throw new ForbiddenException('Inconsistent navigation metadata.');
    }

    return true;
  }
}
