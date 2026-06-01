import { generateRegex } from '@/lib/scraping/infrastructure/regex/regex-generator';

describe('preview regex integration', () => {
  it('generateRegex used in preview returns valid regex string', () => {
    const r = generateRegex('$299.99');
    expect(() => new RegExp(r)).not.toThrow();
    expect(typeof r).toBe('string');
  });
});
