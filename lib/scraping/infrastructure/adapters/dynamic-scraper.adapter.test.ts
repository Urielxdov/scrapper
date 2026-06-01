import { DynamicScraperAdapter } from './dynamic-scraper.adapter';
import { chromium } from 'playwright';

jest.mock('playwright');
const mockedChromium = chromium as jest.Mocked<typeof chromium>;

describe('DynamicScraperAdapter', () => {
  it('extracts data using Playwright', async () => {
    const mockPage = {
      goto: jest.fn(),
      content: jest.fn().mockResolvedValue('<html><span class="price">$200</span></html>'),
      $eval: jest.fn().mockImplementation((_sel: string, fn: (el: Element) => string) =>
        Promise.resolve(fn({ textContent: '$200' } as unknown as Element))
      ),
      close: jest.fn(),
    };
    const mockContext = { newPage: jest.fn().mockResolvedValue(mockPage), close: jest.fn() };
    const mockBrowser = { newContext: jest.fn().mockResolvedValue(mockContext), close: jest.fn() };
    mockedChromium.launch = jest.fn().mockResolvedValue(mockBrowser);

    const adapter = new DynamicScraperAdapter();
    const result = await adapter.scrape('https://example.com', [{ field: 'price', css: '.price' }]);

    expect(result.strategy).toBe('dynamic');
    expect(mockBrowser.close).toHaveBeenCalled();
  });
});
