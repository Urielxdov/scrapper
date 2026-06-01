# Visual Point-and-Click Selector UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a visual UI where users load a proxied page, click elements to pin labeled CSS selectors, preview scraped results with auto-generated regex, and confirm to create a monitor.

**Architecture:** Playwright proxy route renders target pages server-side and injects a click interceptor script. Pins are communicated from the iframe to the parent via postMessage. A preview route scrapes and generates regex patterns. The creation page wires all components together. Home dashboard replaces the default Next.js page.

**Tech Stack:** Next.js 14 App Router, React (client components), Playwright (already installed), Tailwind CSS, TypeScript, Prisma (for home dashboard queries)

---

## File Map

### New files
```
lib/scraping/infrastructure/regex/regex-generator.ts       pure regex generation logic
lib/scraping/infrastructure/regex/regex-generator.test.ts  TDD tests
public/interceptor.js                                      injected into proxied pages (vanilla JS)
app/api/proxy/route.ts                                     GET — Playwright proxy
app/api/preview/route.ts                                   POST — scrape + regex generation
app/monitors/new/page.tsx                                  split-layout creation page
app/monitors/new/components/ProxyFrame.tsx                 iframe + toolbar + postMessage
app/monitors/new/components/PinList.tsx                    accumulated pins list
app/monitors/new/components/LabelPopup.tsx                 NOT USED — popup is in interceptor.js
app/monitors/new/components/PreviewModal.tsx               confirmation modal
```

### Modified files
```
lib/shared/types/monitor.types.ts       add regex?: string to SelectorConfig
worker/index.ts                         regex fallback when CSS selector returns ''
app/layout.tsx                          add navbar
app/page.tsx                            replace with home dashboard
```

---

## Task 1: Regex Generator (TDD)

**Files:**
- Create: `lib/scraping/infrastructure/regex/regex-generator.ts`
- Create: `lib/scraping/infrastructure/regex/regex-generator.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// lib/scraping/infrastructure/regex/regex-generator.test.ts
import { generateRegex } from './regex-generator';

describe('generateRegex', () => {
  it('generates price regex for dollar values', () => {
    const r = generateRegex('$299.99');
    expect(new RegExp(r, 'i').test('$299.99')).toBe(true);
    expect(new RegExp(r, 'i').test('$1,200.00')).toBe(true);
  });

  it('generates price regex for euro values', () => {
    const r = generateRegex('€45.00');
    expect(new RegExp(r, 'i').test('€45.00')).toBe(true);
  });

  it('generates rating regex', () => {
    const r = generateRegex('4.5 stars');
    expect(new RegExp(r, 'i').test('4.5 stars')).toBe(true);
    expect(new RegExp(r, 'i').test('3.8 stars')).toBe(true);
  });

  it('generates count regex', () => {
    const r = generateRegex('1,234 reviews');
    expect(new RegExp(r, 'i').test('1,234 reviews')).toBe(true);
    expect(new RegExp(r, 'i').test('56 reviews')).toBe(true);
  });

  it('generates availability regex', () => {
    const r = generateRegex('En stock');
    expect(new RegExp(r, 'i').test('En stock')).toBe(true);
    expect(new RegExp(r, 'i').test('Out of stock')).toBe(true);
  });

  it('generates percentage regex', () => {
    const r = generateRegex('25%');
    expect(new RegExp(r, 'i').test('25%')).toBe(true);
    expect(new RegExp(r, 'i').test('10.5%')).toBe(true);
  });

  it('generates anchor+variable regex for text with numbers', () => {
    const r = generateRegex('Quedan 3 unidades');
    expect(new RegExp(r, 'i').test('Quedan 3 unidades')).toBe(true);
    expect(new RegExp(r, 'i').test('Quedan 12 unidades')).toBe(true);
  });

  it('generates anchor regex for pure text', () => {
    const r = generateRegex('Nike Air Max 90');
    expect(new RegExp(r, 'i').test('Nike Air Max 90')).toBe(true);
  });

  it('returns .* for empty value', () => {
    expect(generateRegex('')).toBe('.*');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test -- lib/scraping/infrastructure/regex/regex-generator.test.ts --no-coverage
```

Expected: FAIL — "Cannot find module"

- [ ] **Step 3: Implement**

```ts
// lib/scraping/infrastructure/regex/regex-generator.ts

type KnownType = 'price' | 'rating' | 'count' | 'availability' | 'percentage' | 'unknown';

function inferType(value: string): KnownType {
  if (/^[$€£¥]\s*[\d,]/.test(value) || /[\d,]+\s*(usd|eur|mxn|cop|gbp)\b/i.test(value)) return 'price';
  if (/[\d.]+\s*(\/\s*\d+|stars?|estrellas?)/i.test(value)) return 'rating';
  if (/[\d,]+\s*(reviews?|reseñas?|items?|resultados?|productos?|opiniones?)/i.test(value)) return 'count';
  if (/(en stock|out of stock|agotado|available|unavailable|in stock)/i.test(value)) return 'availability';
  if (/[\d.]+\s*%/.test(value)) return 'percentage';
  return 'unknown';
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildAnchorRegex(value: string): string {
  // Split on numeric sequences, keep them as variable parts
  const parts = value.split(/(\d[\d,]*\.?\d*)/).map((token, i) => {
    if (/^\d[\d,]*\.?\d*$/.test(token)) return '[\\d,]+\\.?\\d*';
    if (token === '') return '';
    return escapeRegex(token).replace(/\s+/g, '\\s+');
  });
  return parts.filter(Boolean).join('');
}

export function generateRegex(value: string): string {
  if (!value) return '.*';

  const type = inferType(value);

  switch (type) {
    case 'price':        return '[$€£¥]\\s*[\\d,]+\\.?\\d*';
    case 'rating':       return '[\\d.]+\\s*(\\/\\s*\\d+|stars?|estrellas?)';
    case 'count':        return '[\\d,]+\\s*(reviews?|reseñas?|items?|resultados?|productos?|opiniones?)';
    case 'availability': return '(en stock|out of stock|agotado|available|unavailable|in stock)';
    case 'percentage':   return '[\\d.]+\\s*%';
    default: {
      if (/\d/.test(value)) return buildAnchorRegex(value);
      // Pure text: first 3 words as anchor
      const words = value.trim().split(/\s+/).slice(0, 3);
      return words.map(escapeRegex).join('\\s+') + '.*';
    }
  }
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npm test -- lib/scraping/infrastructure/regex/regex-generator.test.ts --no-coverage
```

Expected: 9 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/scraping/infrastructure/regex/
git commit -m "feat: add regex generator with type inference and anchor/variable fallback"
```

---

## Task 2: Update SelectorConfig Type

**Files:**
- Modify: `lib/shared/types/monitor.types.ts`

- [ ] **Step 1: Add optional regex field**

Replace in `lib/shared/types/monitor.types.ts`:

```ts
// Before:
export type SelectorConfig = { field: string, css: string }

// After:
export type SelectorConfig = { field: string; css: string; regex?: string }
```

Full updated file:
```ts
export type SelectorConfig = { field: string; css: string; regex?: string }
export type DiffEntry = { field: string; oldValue: string; newValue: string }
export type ChangeType = 'CONTENT_DIFF' | 'SELECTOR_MISSING'
export type Role = 'ADMIN' | 'USER'

export type ScrapeResult = {
  extractedData: Record<string, string>
  rawHTML: string
  strategy: 'static' | 'dynamic'
}
```

- [ ] **Step 2: Run all tests — expect PASS (no breakage)**

```bash
npm test -- --no-coverage
```

Expected: 12 suites, 27+ tests PASS (regex field is optional, no callsites break)

- [ ] **Step 3: Commit**

```bash
git add lib/shared/types/monitor.types.ts
git commit -m "feat: add optional regex field to SelectorConfig"
```

---

## Task 3: Worker Regex Fallback

**Files:**
- Modify: `worker/index.ts`

- [ ] **Step 1: Update the per-field diff logic in worker**

In `worker/index.ts`, find the per-selector loop that builds `diff` and `missingSelectorFields`. Replace the existing loop with one that tries regex when CSS returns empty:

```ts
// Replace the existing for loop that reads:
// for (const { field } of selectors) {
// with:

for (const { field, regex } of selectors) {
  let currentVal = current.extractedData[field] ?? '';

  // Regex fallback: if CSS selector returned empty and regex exists, search raw HTML
  if (currentVal === '' && regex) {
    try {
      const match = current.rawHTML.match(new RegExp(regex, 'i'));
      if (match) currentVal = match[0].trim();
    } catch {
      // invalid regex — ignore
    }
  }

  const previousVal = previous?.extractedData[field] ?? null;

  if (currentVal === '') {
    missingSelectorFields.push(field);
  } else if (previousVal !== null && currentVal !== previousVal) {
    diff.push({ field, oldValue: previousVal, newValue: currentVal });
  }
}
```

Full updated worker section (the job handler body, replace from `const diff: DiffEntry[] = [];` to `await prisma.target.update(...)`):

```ts
const current = await scrapeUseCase.execute({ targetId, url, selectors });
const previous = await docRepo.findLatestByTargetId(targetId);

const diff: DiffEntry[] = [];
const missingSelectorFields: string[] = [];

for (const { field, regex } of selectors) {
  let currentVal = current.extractedData[field] ?? '';

  if (currentVal === '' && regex) {
    try {
      const match = current.rawHTML.match(new RegExp(regex, 'i'));
      if (match) currentVal = match[0].trim();
    } catch {
      // invalid regex — skip fallback
    }
  }

  const previousVal = previous?.extractedData[field] ?? null;

  if (currentVal === '') {
    missingSelectorFields.push(field);
  } else if (previousVal !== null && currentVal !== previousVal) {
    diff.push({ field, oldValue: previousVal, newValue: currentVal });
  }
}
```

- [ ] **Step 2: Verify tests still pass**

```bash
npm test -- --no-coverage
```

Expected: all tests PASS

- [ ] **Step 3: Commit**

```bash
git add worker/index.ts
git commit -m "feat: add regex fallback to worker when CSS selector returns empty"
```

---

## Task 4: Click Interceptor Script

**Files:**
- Create: `public/interceptor.js`

- [ ] **Step 1: Create interceptor script**

```js
// public/interceptor.js
// Injected into proxied pages. Handles hover highlight, click-to-pin, postMessage to parent.
(function () {
  'use strict';

  // ─── CSS Selector Generator ──────────────────────────────────────────────────
  function escapeCSS(str) {
    return CSS.escape ? CSS.escape(str) : str.replace(/([!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~])/g, '\\$1');
  }

  function generateSelector(el) {
    if (el.id) return '#' + escapeCSS(el.id);

    const classes = Array.from(el.classList).filter(Boolean);
    for (const cls of classes) {
      const sel = '.' + escapeCSS(cls);
      try { if (document.querySelectorAll(sel).length === 1) return sel; } catch {}
    }

    if (classes.length > 0) {
      const sel = el.tagName.toLowerCase() + '.' + classes.map(escapeCSS).join('.');
      try { if (document.querySelectorAll(sel).length === 1) return sel; } catch {}
    }

    // Build nth-of-type path up to body
    const path = [];
    let current = el;
    while (current && current.tagName && current.tagName.toLowerCase() !== 'body') {
      if (current.id) { path.unshift('#' + escapeCSS(current.id)); break; }
      const tag = current.tagName.toLowerCase();
      const siblings = Array.from(current.parentNode ? current.parentNode.children : [])
        .filter(s => s.tagName === current.tagName);
      const selector = siblings.length > 1
        ? tag + ':nth-of-type(' + (siblings.indexOf(current) + 1) + ')'
        : tag;
      path.unshift(selector);
      current = current.parentNode;
    }
    return path.join(' > ');
  }

  // ─── Hover Highlight ─────────────────────────────────────────────────────────
  let hovered = null;
  const HIGHLIGHT_STYLE = '2px solid #3b82f6';

  document.addEventListener('mouseover', function (e) {
    if (hovered) hovered.style.outline = '';
    hovered = e.target;
    if (hovered && hovered !== document.body && hovered !== document.documentElement) {
      hovered.style.outline = HIGHLIGHT_STYLE;
    }
  }, true);

  document.addEventListener('mouseout', function (e) {
    if (e.target === hovered) {
      hovered.style.outline = '';
      hovered = null;
    }
  }, true);

  // ─── Popup ───────────────────────────────────────────────────────────────────
  let popup = null;

  function removePopup() {
    if (popup) { popup.remove(); popup = null; }
  }

  function showPopup(x, y, css) {
    removePopup();
    popup = document.createElement('div');
    popup.id = '__scrapper_popup';
    popup.style.cssText = [
      'position:fixed',
      'top:' + Math.min(y, window.innerHeight - 160) + 'px',
      'left:' + Math.min(x, window.innerWidth - 230) + 'px',
      'background:#fff',
      'border:1px solid #e5e7eb',
      'border-radius:8px',
      'padding:12px',
      'box-shadow:0 4px 12px rgba(0,0,0,.15)',
      'z-index:2147483647',
      'font-family:system-ui,sans-serif',
      'font-size:13px',
      'min-width:220px',
      'box-sizing:border-box',
    ].join(';');

    popup.innerHTML =
      '<div style="margin-bottom:6px;color:#374151;font-weight:600;">Nombre del campo</div>' +
      '<input id="__scrapper_input" type="text" placeholder="ej. precio" autocomplete="off" style="' +
        'width:100%;border:1px solid #d1d5db;border-radius:4px;padding:6px 8px;' +
        'outline:none;box-sizing:border-box;font-size:13px;' +
      '" />' +
      '<div style="margin-top:8px;display:flex;gap:6px;justify-content:flex-end;">' +
        '<button id="__scrapper_cancel" style="padding:4px 10px;border:1px solid #d1d5db;border-radius:4px;background:#fff;cursor:pointer;font-size:12px;">Cancelar</button>' +
        '<button id="__scrapper_add" style="padding:4px 10px;background:#3b82f6;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;">Agregar</button>' +
      '</div>';

    document.body.appendChild(popup);

    var input = popup.querySelector('#__scrapper_input');
    input.focus();

    popup.querySelector('#__scrapper_cancel').addEventListener('click', removePopup);

    popup.querySelector('#__scrapper_add').addEventListener('click', function () {
      var label = input.value.trim();
      if (!label) { input.focus(); return; }
      window.parent.postMessage({ type: 'PIN_ADDED', label: label, css: css }, '*');
      removePopup();
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') popup.querySelector('#__scrapper_add').click();
      if (e.key === 'Escape') removePopup();
    });
  }

  // ─── Click Handler ───────────────────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    // Clicks inside our popup bubble normally
    if (popup && popup.contains(e.target)) return;

    e.preventDefault();
    e.stopPropagation();

    if (hovered) hovered.style.outline = '';
    hovered = null;

    var css = generateSelector(e.target);
    showPopup(e.clientX + 8, e.clientY + 8, css);
  }, true);

  // Block all link navigation
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a') : null;
    if (a) e.preventDefault();
  }, true);

  // Close popup on Escape globally
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') removePopup();
  });
})();
```

- [ ] **Step 2: Commit**

```bash
git add public/interceptor.js
git commit -m "feat: add click interceptor script for proxied pages"
```

---

## Task 5: Proxy Route (GET /api/proxy)

**Files:**
- Create: `app/api/proxy/route.ts`

- [ ] **Step 1: Create route**

```ts
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

    // Speed up: skip fonts and images
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
```

- [ ] **Step 2: Commit**

```bash
git add app/api/proxy/route.ts
git commit -m "feat: add Playwright-based proxy route for visual selector UI"
```

---

## Task 6: Preview Route (POST /api/preview)

**Files:**
- Create: `app/api/preview/route.ts`

- [ ] **Step 1: Write test**

```ts
// app/api/preview/route.test.ts
// NOTE: this tests the regex generation logic only (Playwright is not mocked here).
// Full integration test requires a running browser.
import { generateRegex } from '@/lib/scraping/infrastructure/regex/regex-generator';

describe('preview regex integration', () => {
  it('generateRegex used in preview returns valid regex string', () => {
    const r = generateRegex('$299.99');
    expect(() => new RegExp(r)).not.toThrow();
    expect(typeof r).toBe('string');
  });
});
```

- [ ] **Step 2: Run test — expect PASS**

```bash
npm test -- app/api/preview/route.test.ts --no-coverage
```

- [ ] **Step 3: Create route**

```ts
// app/api/preview/route.ts
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
```

- [ ] **Step 4: Run all tests — expect PASS**

```bash
npm test -- --no-coverage
```

- [ ] **Step 5: Commit**

```bash
git add app/api/preview/
git commit -m "feat: add preview route — scrapes selectors and generates regex"
```

---

## Task 7: App Layout with Navbar

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Update layout with navbar**

Replace `app/layout.tsx` with:

```tsx
import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export const metadata: Metadata = {
  title: 'Scrapper',
  description: 'Monitor de cambios en páginas web',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased bg-gray-50">
        <nav className="bg-white border-b px-6 py-3 flex items-center gap-6">
          <Link href="/" className="font-semibold text-gray-900">Scrapper</Link>
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</Link>
          <Link href="/monitors/new" className="text-sm text-gray-600 hover:text-gray-900">Nuevo Monitor</Link>
        </nav>
        <div className="flex-1 flex flex-col">{children}</div>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: add navbar to app layout"
```

---

## Task 8: Home Dashboard

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace with dashboard**

Replace the full content of `app/page.tsx`:

```tsx
import Link from 'next/link';
import { prisma } from '@/lib/shared/prisma';
import { auth } from '@/lib/auth/infrastructure/adapters/authjs.config';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const userId = session.user.id!;

  const monitors = await prisma.monitor.findMany({
    where: { userId },
    include: { target: true },
    orderBy: { createdAt: 'desc' },
  });

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const changes = await prisma.change.findMany({
    where: { target: { monitors: { some: { userId } } } },
    select: { targetId: true, detectedAt: true },
    orderBy: { detectedAt: 'desc' },
  });

  const alertsToday = changes.filter(c => c.detectedAt >= todayStart).length;
  const changesThisWeek = changes.filter(c => c.detectedAt >= weekStart).length;
  const recentTargetIds = new Set(changes.slice(0, 50).map(c => c.targetId));

  function statusColor(monitor: typeof monitors[0]): string {
    if (!monitor.isActive) return 'bg-red-500';
    if (recentTargetIds.has(monitor.targetId)) return 'bg-yellow-400';
    return 'bg-green-500';
  }

  return (
    <main className="max-w-6xl mx-auto w-full p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Link
          href="/monitors/new"
          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
        >
          + Nuevo Monitor
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Monitores activos', value: monitors.filter(m => m.isActive).length },
          { label: 'Alertas hoy', value: alertsToday },
          { label: 'Cambios esta semana', value: changesThisWeek },
        ].map(stat => (
          <div key={stat.label} className="bg-white border rounded-xl p-5 shadow-sm">
            <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Nombre', 'URL', 'Estado', 'Última corrida', 'Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monitors.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-400">
                  Sin monitores aún.{' '}
                  <Link href="/monitors/new" className="text-blue-500 hover:underline">Crea uno</Link>
                </td>
              </tr>
            )}
            {monitors.map(m => (
              <tr key={m.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {m.name ?? m.id.slice(0, 8)}
                </td>
                <td className="px-4 py-3 text-gray-500 max-w-[220px] truncate">
                  {m.target.url}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block w-3 h-3 rounded-full ${statusColor(m)}`} />
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {m.target.lastRunAt
                    ? new Date(m.target.lastRunAt).toLocaleString('es-MX')
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  <DeleteMonitorButton id={m.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

// Inline client component for delete action
'use client';
function DeleteMonitorButton({ id }: { id: string }) {
  const handleDelete = async () => {
    if (!confirm('¿Eliminar este monitor?')) return;
    await fetch(`/api/monitors/${id}`, { method: 'DELETE' });
    window.location.reload();
  };
  return (
    <button onClick={handleDelete} className="text-red-500 hover:underline text-xs">
      Eliminar
    </button>
  );
}
```

> **Note:** `'use client'` inside a `.tsx` file only applies to a component when that directive is at the top of the file. Since this is a server component file, extract `DeleteMonitorButton` to its own file if the compiler complains. See Step 2.

- [ ] **Step 2: If compiler error about mixing client/server — extract button**

Create `app/components/DeleteMonitorButton.tsx`:

```tsx
'use client';

export function DeleteMonitorButton({ id }: { id: string }) {
  const handleDelete = async () => {
    if (!confirm('¿Eliminar este monitor?')) return;
    await fetch(`/api/monitors/${id}`, { method: 'DELETE' });
    window.location.reload();
  };
  return (
    <button onClick={handleDelete} className="text-red-500 hover:underline text-xs">
      Eliminar
    </button>
  );
}
```

Then in `app/page.tsx`, replace the inline component with:
```tsx
import { DeleteMonitorButton } from '@/app/components/DeleteMonitorButton';
```

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx app/components/
git commit -m "feat: add home dashboard with stats and monitors table"
```

---

## Task 9: ProxyFrame Component

**Files:**
- Create: `app/monitors/new/components/ProxyFrame.tsx`

- [ ] **Step 1: Create component**

```tsx
// app/monitors/new/components/ProxyFrame.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

export type Pin = { label: string; css: string };

type ProxyFrameProps = {
  onPinAdded: (pin: Pin) => void;
  onUrlChange: (url: string) => void;
};

export function ProxyFrame({ onPinAdded, onUrlChange }: ProxyFrameProps) {
  const [inputUrl, setInputUrl] = useState('');
  const [iframeSrc, setIframeSrc] = useState('');
  const [loading, setLoading] = useState(false);

  // Listen for postMessage pins from the interceptor
  useEffect(() => {
    function handler(e: MessageEvent) {
      if (e.data?.type === 'PIN_ADDED' && e.data.label && e.data.css) {
        onPinAdded({ label: e.data.label, css: e.data.css });
      }
    }
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onPinAdded]);

  function handleLoad() {
    if (!inputUrl.trim()) return;
    let url = inputUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    onUrlChange(url);
    setLoading(true);
    setIframeSrc('/api/proxy?url=' + encodeURIComponent(url));
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex gap-2 p-3 border-b bg-white">
        <input
          type="text"
          value={inputUrl}
          onChange={e => setInputUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLoad()}
          placeholder="https://ejemplo.com/producto"
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <button
          onClick={handleLoad}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
        >
          Cargar
        </button>
      </div>

      {/* Iframe area */}
      <div className="flex-1 relative bg-gray-100">
        {!iframeSrc && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
            Ingresa una URL y haz clic en <strong className="mx-1">Cargar</strong> para comenzar
          </div>
        )}
        {iframeSrc && (
          <iframe
            src={iframeSrc}
            className="w-full h-full border-0"
            sandbox="allow-same-origin allow-scripts allow-forms"
            onLoad={() => setLoading(false)}
          />
        )}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-sm text-gray-500">
            Cargando página...
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/monitors/new/components/ProxyFrame.tsx
git commit -m "feat: add ProxyFrame component with postMessage pin receiver"
```

---

## Task 10: PinList Component

**Files:**
- Create: `app/monitors/new/components/PinList.tsx`

- [ ] **Step 1: Create component**

```tsx
// app/monitors/new/components/PinList.tsx
'use client';

export type Pin = { label: string; css: string };

type PinListProps = {
  pins: Pin[];
  onRemove: (index: number) => void;
};

export function PinList({ pins, onRemove }: PinListProps) {
  if (pins.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-6 border border-dashed rounded-lg">
        Haz clic en elementos de la página para agregar campos
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {pins.map((pin, i) => (
        <li
          key={i}
          className="flex items-start justify-between bg-gray-50 rounded-lg px-3 py-2 border"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-800">{pin.label}</p>
            <p className="text-xs text-gray-400 truncate" title={pin.css}>{pin.css}</p>
          </div>
          <button
            onClick={() => onRemove(i)}
            className="ml-2 text-gray-300 hover:text-red-500 text-lg leading-none flex-shrink-0"
            title="Eliminar campo"
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/monitors/new/components/PinList.tsx
git commit -m "feat: add PinList component for accumulated selector pins"
```

---

## Task 11: PreviewModal Component

**Files:**
- Create: `app/monitors/new/components/PreviewModal.tsx`

- [ ] **Step 1: Create component**

```tsx
// app/monitors/new/components/PreviewModal.tsx
'use client';

export type PreviewResult = {
  label: string;
  css: string;
  regex: string;
  values: string[];
  count: number;
};

type PreviewModalProps = {
  results: PreviewResult[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
};

export function PreviewModal({ results, loading, error, onClose, onConfirm }: PreviewModalProps) {
  const canCreate = !loading && !error && results.length > 0 && results.every(r => r.count > 0);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Resultados encontrados</h2>
        </div>

        <div className="p-6">
          {loading && (
            <p className="text-center text-gray-400 py-8 text-sm">Buscando elementos en la página...</p>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && (
            <ul className="divide-y">
              {results.map((r, i) => (
                <li key={i} className="flex items-center justify-between py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800">{r.label}</p>
                    <p className="text-xs text-gray-500 truncate">{r.values[0] ?? '—'}</p>
                  </div>
                  <span className={`ml-4 flex-shrink-0 text-xs px-2 py-1 rounded-full font-medium ${
                    r.count === 0
                      ? 'bg-red-100 text-red-700'
                      : r.count === 1
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {r.count === 0
                      ? '❌ Sin coincidencias'
                      : r.count === 1
                      ? '⚠️ 1 coincidencia'
                      : `${r.count} coincidencias`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-6 border-t flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            ← Editar
          </button>
          <button
            onClick={onConfirm}
            disabled={!canCreate}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ✓ Crear Monitor
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/monitors/new/components/PreviewModal.tsx
git commit -m "feat: add PreviewModal component with result validation"
```

---

## Task 12: Create Monitor Page — Wire Everything

**Files:**
- Create: `app/monitors/new/page.tsx`

- [ ] **Step 1: Create page**

```tsx
// app/monitors/new/page.tsx
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProxyFrame, Pin } from './components/ProxyFrame';
import { PinList } from './components/PinList';
import { PreviewModal, PreviewResult } from './components/PreviewModal';

const FREQUENCY_OPTIONS = [
  { label: '15 minutos', value: 15 },
  { label: '30 minutos', value: 30 },
  { label: '1 hora', value: 60 },
  { label: '6 horas', value: 360 },
  { label: '24 horas', value: 1440 },
];

export default function NewMonitorPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState(60);
  const [pins, setPins] = useState<Pin[]>([]);
  const [currentUrl, setCurrentUrl] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [previewResults, setPreviewResults] = useState<PreviewResult[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handlePinAdded = useCallback((pin: Pin) => {
    setPins(prev => [...prev, pin]);
  }, []);

  const handleRemovePin = (index: number) => {
    setPins(prev => prev.filter((_, i) => i !== index));
  };

  const handlePreview = async () => {
    if (!currentUrl || pins.length === 0) return;
    setShowModal(true);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewResults([]);

    try {
      const res = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: currentUrl, selectors: pins }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Error al previsualizar');
      }
      setPreviewResults(await res.json());
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/monitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || undefined,
          url: currentUrl,
          selectors: previewResults.map(r => ({
            field: r.label,
            css: r.css,
            regex: r.regex,
          })),
          frequencyMinutes: frequency,
        }),
      });
      if (res.ok) router.push('/');
    } finally {
      setSubmitting(false);
    }
  };

  const canPreview = pins.length > 0 && !!currentUrl;

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left panel */}
      <div className="w-[380px] flex-shrink-0 flex flex-col border-r bg-white overflow-y-auto">
        <div className="p-6 space-y-5 flex-1">
          <h1 className="text-xl font-bold text-gray-900">Nuevo Monitor</h1>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre (opcional)</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Mi monitor de precios"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia de monitoreo</label>
            <select
              value={frequency}
              onChange={e => setFrequency(Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {FREQUENCY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Campos detectados{pins.length > 0 && ` (${pins.length})`}
            </label>
            <PinList pins={pins} onRemove={handleRemovePin} />
          </div>
        </div>

        <div className="p-6 border-t">
          <button
            onClick={handlePreview}
            disabled={!canPreview}
            className="w-full py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Previsualizar resultados
          </button>
          {!currentUrl && (
            <p className="text-xs text-gray-400 mt-2 text-center">Carga una URL primero</p>
          )}
          {currentUrl && pins.length === 0 && (
            <p className="text-xs text-gray-400 mt-2 text-center">Haz clic en elementos de la página</p>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ProxyFrame onPinAdded={handlePinAdded} onUrlChange={setCurrentUrl} />
      </div>

      {showModal && (
        <PreviewModal
          results={previewResults}
          loading={previewLoading}
          error={previewError}
          onClose={() => setShowModal(false)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run all tests — expect PASS**

```bash
npm test -- --no-coverage
```

Expected: all tests PASS

- [ ] **Step 3: Final commit**

```bash
git add app/monitors/new/ app/page.tsx app/layout.tsx app/components/
git commit -m "feat: complete visual selector UI — proxy, preview, home dashboard, creation flow"
```
