import { SelectorConfig } from '@/lib/shared/types/monitor.types';

export class Target {
  constructor(
    public readonly id: string,
    public readonly url: string,
    public readonly selectors: SelectorConfig[],
    public readonly frequency: number,
    public readonly lastRunAt: Date | null = null,
    public readonly createdAt: Date = new Date(),
  ) {
    try { new URL(url); } catch { throw new Error('Invalid URL'); }
  }

  mergeSelectors(incoming: SelectorConfig[]): SelectorConfig[] {
    const map = new Map(this.selectors.map(s => [s.field, s.css]));
    for (const s of incoming) map.set(s.field, s.css);
    return Array.from(map.entries()).map(([field, css]) => ({ field, css }));
  }
}
