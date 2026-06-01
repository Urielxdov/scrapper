import { ScrapeTargetUseCase } from './scrape-target.use-case';
import { ScraperStrategyPort } from '../../domain/ports/scraper-strategy.port';
import { IScrapedDocumentRepository } from '../../domain/ports/scraped-document-repository.port';

describe('ScrapeTargetUseCase', () => {
  let staticAdapter: jest.Mocked<ScraperStrategyPort>;
  let dynamicAdapter: jest.Mocked<ScraperStrategyPort>;
  let docRepo: jest.Mocked<IScrapedDocumentRepository>;

  beforeEach(() => {
    staticAdapter = { canHandle: jest.fn(), scrape: jest.fn() };
    dynamicAdapter = { canHandle: jest.fn(), scrape: jest.fn() };
    docRepo = { save: jest.fn(), findLatestByTargetId: jest.fn(), findByTargetId: jest.fn() };
  });

  it('uses static adapter when it can handle URL', async () => {
    staticAdapter.canHandle.mockResolvedValue(true);
    staticAdapter.scrape.mockResolvedValue({ rawHTML: '<html/>', extractedData: { price: '$100' }, strategy: 'static' });
    docRepo.save.mockImplementation(async (d) => ({ ...d, id: 'doc-1' }));

    const uc = new ScrapeTargetUseCase([staticAdapter, dynamicAdapter], docRepo);
    const result = await uc.execute({ targetId: 't1', url: 'https://x.com', selectors: [{ field: 'price', css: '.p' }] });

    expect(staticAdapter.scrape).toHaveBeenCalled();
    expect(dynamicAdapter.scrape).not.toHaveBeenCalled();
    expect(result.scrapeStrategy).toBe('static');
  });

  it('falls back to dynamic when static cannot handle', async () => {
    staticAdapter.canHandle.mockResolvedValue(false);
    dynamicAdapter.canHandle.mockResolvedValue(true);
    dynamicAdapter.scrape.mockResolvedValue({ rawHTML: '<html/>', extractedData: { price: '$200' }, strategy: 'dynamic' });
    docRepo.save.mockImplementation(async (d) => ({ ...d, id: 'doc-2' }));

    const uc = new ScrapeTargetUseCase([staticAdapter, dynamicAdapter], docRepo);
    const result = await uc.execute({ targetId: 't1', url: 'https://x.com', selectors: [] });

    expect(dynamicAdapter.scrape).toHaveBeenCalled();
    expect(result.scrapeStrategy).toBe('dynamic');
  });

  it('throws if no strategy can handle the URL', async () => {
    staticAdapter.canHandle.mockResolvedValue(false);
    dynamicAdapter.canHandle.mockResolvedValue(false);

    const uc = new ScrapeTargetUseCase([staticAdapter, dynamicAdapter], docRepo);
    await expect(uc.execute({ targetId: 't1', url: 'https://x.com', selectors: [] }))
      .rejects.toThrow('No strategy available');
  });
});
