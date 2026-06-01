import { ScraperStrategyPort } from '../../domain/ports/scraper-strategy.port';
import { IScrapedDocumentRepository, ScrapedDocument } from '../../domain/ports/scraped-document-repository.port';
import { SelectorConfig } from '@/lib/shared/types/monitor.types';

type ScrapeInput = { targetId: string; url: string; selectors: SelectorConfig[] };

export class ScrapeTargetUseCase {
  constructor(
    private readonly strategies: ScraperStrategyPort[],
    private readonly docRepo: IScrapedDocumentRepository,
  ) {}

  async execute(input: ScrapeInput): Promise<ScrapedDocument> {
    let result = null;
    for (const strategy of this.strategies) {
      if (await strategy.canHandle(input.url)) {
        result = await strategy.scrape(input.url, input.selectors);
        break;
      }
    }
    if (!result) throw new Error('No strategy available');

    return this.docRepo.save({
      targetId: input.targetId,
      url: input.url,
      rawHTML: result.rawHTML,
      extractedData: result.extractedData,
      scrapeStrategy: result.strategy,
      scrapedAt: new Date(),
    });
  }
}
