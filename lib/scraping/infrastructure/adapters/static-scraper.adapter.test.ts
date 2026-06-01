import { StaticScraperAdapter } from './static-scraper.adapter';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('StaticScraperAdapter', () => {
  const adapter = new StaticScraperAdapter();

  it('extracts data using CSS selectors', async () => {
    mockedAxios.get.mockResolvedValue({
      data: '<html><body><span class="price">$100</span></body></html>',
      status: 200,
    });

    const result = await adapter.scrape('https://example.com', [
      { field: 'price', css: '.price' },
    ]);

    expect(result.extractedData).toEqual({ price: '$100' });
    expect(result.strategy).toBe('static');
  });

  it('marks missing selectors as empty string', async () => {
    mockedAxios.get.mockResolvedValue({
      data: '<html><body></body></html>',
      status: 200,
    });

    const result = await adapter.scrape('https://example.com', [
      { field: 'price', css: '.missing' },
    ]);

    expect(result.extractedData).toEqual({ price: '' });
  });

  it('canHandle returns true for accessible URLs', async () => {
    mockedAxios.head.mockResolvedValue({ status: 200 });
    expect(await adapter.canHandle('https://example.com')).toBe(true);
  });

  it('canHandle returns false when request fails', async () => {
    mockedAxios.head.mockRejectedValue(new Error('Network error'));
    expect(await adapter.canHandle('https://broken.com')).toBe(false);
  });
});
