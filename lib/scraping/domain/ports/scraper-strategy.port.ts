import { SelectorConfig, ScrapeResult } from '@/lib/shared/types/monitor.types';

export interface ScraperStrategyPort {
  canHandle(url: string): Promise<boolean>;
  scrape(url: string, selectors: SelectorConfig[]): Promise<ScrapeResult>;
}
