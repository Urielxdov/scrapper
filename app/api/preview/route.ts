import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';
import { generateRegex } from '@/lib/scraping/infrastructure/regex/regex-generator';

type SelectorInput = { label: string; css: string };

type PreviewResult = {
  label: string;
  css: string;
  regex: string;
  values: string[];
  count: number;
};

export async function POST(req: NextRequest) {
  const body = await req.json() as { url?: string; selectors?: SelectorInput[] };
  const { url, selectors } = body;

  if (!url || !selectors?.length) {
    return NextResponse.json({ error: 'url y selectors requeridos' }, { status: 400 });
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const results: PreviewResult[] = [];

    for (const { label, css } of selectors) {
      let values: string[] = [];
      try {
        values = await page.$$eval(css, els =>
          els.map(el => el.textContent?.trim() ?? '').filter(Boolean)
        );
      } catch {
        // invalid selector — leave values empty
      }

      const firstValue = values[0] ?? '';
      const regex = generateRegex(firstValue);

      results.push({ label, css, regex, values: values.slice(0, 5), count: values.length });
    }

    return NextResponse.json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al previsualizar';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await browser.close();
  }
}
