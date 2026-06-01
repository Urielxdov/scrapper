// app/api/proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'url requerida' }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
  }

  const interceptorScript = readFileSync(join(process.cwd(), 'public', 'interceptor.js'), 'utf-8');

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    // Speed up: skip fonts
    await page.route('**/*.{woff,woff2,ttf,eot,otf}', r => r.abort());

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    let html = await page.content();

    // Rewrite relative URLs to absolute so assets load
    html = html
      .replace(/(href|src|action)="\/(?!\/)/g, `$1="${parsedUrl.origin}/`)
      .replace(/(href|src|action)='\/(?!\/)/g, `$1='${parsedUrl.origin}/`);

    // Inject interceptor before </body>
    html = html.replace('</body>', `<script>${interceptorScript}</script></body>`);

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al cargar la página';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await browser.close();
  }
}
