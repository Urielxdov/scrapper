import { Target } from './target.entity';

describe('Target entity', () => {
  it('creates target with selectors', () => {
    const t = new Target('id', 'https://example.com', [{ field: 'price', css: '.price' }], 60);
    expect(t.selectors).toHaveLength(1);
  });

  it('rejects invalid URL', () => {
    expect(() => new Target('id', 'not-a-url', [], 60)).toThrow('Invalid URL');
  });

  it('merges selectors by field (no duplicates)', () => {
    const t = new Target('id', 'https://x.com', [{ field: 'price', css: '.old' }], 60);
    const merged = t.mergeSelectors([{ field: 'price', css: '.new' }, { field: 'title', css: 'h1' }]);
    expect(merged).toHaveLength(2);
    expect(merged.find(s => s.field === 'price')?.css).toBe('.new');
  });
});
