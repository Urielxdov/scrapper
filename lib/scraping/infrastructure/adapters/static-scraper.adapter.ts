import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScraperStrategyPort } from '../../domain/ports/scraper-strategy.port';
import { SelectorConfig, ScrapeResult } from '@/lib/shared/types/monitor.types';

export class StaticScraperAdapter implements ScraperStrategyPort {
  async canHandle(url: string): Promise<boolean> {
    try {
      await axios.head(url, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async scrape(url: string, selectors: SelectorConfig[]): Promise<ScrapeResult> {
    const { data: rawHTML } = await axios.get<string>(url, { timeout: 10000 });
    const $ = cheerio.load(rawHTML);
    const extractedData: Record<string, string> = {};
    for (const { field, css } of selectors) {
      extractedData[field] = $(css).first().text().trim();
    }
    return { rawHTML, extractedData, strategy: 'static' };
  }
}
