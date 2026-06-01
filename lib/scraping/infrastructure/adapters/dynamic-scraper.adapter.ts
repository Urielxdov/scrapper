import { chromium } from 'playwright';
import { ScraperStrategyPort } from '../../domain/ports/scraper-strategy.port';
import { SelectorConfig, ScrapeResult } from '@/lib/shared/types/monitor.types';

export class DynamicScraperAdapter implements ScraperStrategyPort {
  async canHandle(_url: string): Promise<boolean> {
    return true;
  }

  async scrape(url: string, selectors: SelectorConfig[]): Promise<ScrapeResult> {
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      const rawHTML = await page.content();
      const extractedData: Record<string, string> = {};
      for (const { field, css } of selectors) {
        try {
          extractedData[field] = await page.$eval(css, (el) => el.textContent?.trim() ?? '');
        } catch {
          extractedData[field] = '';
        }
      }
      await context.close();
      return { rawHTML, extractedData, strategy: 'dynamic' };
    } finally {
      await browser.close();
    }
  }
}
