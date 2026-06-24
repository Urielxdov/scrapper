# Changes Dashboard — Design Spec
**Date:** 2026-06-24

## Goal
Surface change events from monitors in the UI: a global feed on the dashboard and a full history page per monitor.

## Data Model (existing, no migrations needed)

```
Change { id, targetId, type (CONTENT_DIFF | SELECTOR_MISSING), diff (DiffEntry[]), detectedAt }
DiffEntry { field, oldValue, newValue }
Target  { id, url, selectors, frequency, lastRunAt }
Monitor { id, name, userId, targetId, isActive }
```

## API

### GET /api/changes
Returns the 20 most recent changes across all monitors.

Response shape:
```ts
{
  id: string
  type: 'CONTENT_DIFF' | 'SELECTOR_MISSING'
  diff: { field: string; oldValue: string; newValue: string }[]
  detectedAt: string // ISO
  target: {
    url: string
    monitors: { id: string; name: string | null }[]
  }
}[]
```

Implementation: `prisma.change.findMany({ take: 20, orderBy: { detectedAt: 'desc' }, include: { target: { include: { monitors: true } } } })`

### GET /api/monitors/[id]/changes
Returns paginated changes for a specific monitor (via its targetId).

Query params: `limit` (default 50), `offset` (default 0)

Response shape:
```ts
{
  data: {
    id: string
    type: 'CONTENT_DIFF' | 'SELECTOR_MISSING'
    diff: { field: string; oldValue: string; newValue: string }[]
    detectedAt: string
  }[]
  total: number
}
```

Implementation: fetch monitor → get targetId → `prisma.change.findMany({ where: { targetId }, ... })` + `prisma.change.count({ where: { targetId } })`

## UI

### Dashboard (`/dashboard`) — modified

Add a "Últimos cambios" section below the monitors table.

- Client component `ChangesFeed` — fetches `/api/changes` on mount, shows spinner while loading
- Each item shows:
  - Monitor name as link to `/monitors/[id]` + target URL (muted)
  - Badge: `CONTENT_DIFF` (blue) / `SELECTOR_MISSING` (orange)
  - Each diff entry: `field: oldValue → newValue`
  - Relative timestamp ("hace 2h")
- Monitor name in the table becomes a `<Link href="/monitors/[id]">` clickable

### Monitor Detail (`/monitors/[id]`) — new page

Server Component shell (fetches monitor metadata via Prisma) + Client Component `ChangesHistory` for the paginated table.

**Header section:**
- Monitor name, URL, active/inactive badge, frequency (minutes), last run timestamp

**Changes table:**
- Columns: Fecha, Tipo, Campos cambiados
- "Campos cambiados" cell: shows `field: old → new` for each diff entry, truncated if >3 entries with "ver más"
- Pagination: prev/next buttons, 50 records per page
- Fetches `/api/monitors/[id]/changes?limit=50&offset=N`

## Files

| File | Action |
|------|--------|
| `app/api/changes/route.ts` | new |
| `app/api/monitors/[id]/changes/route.ts` | new |
| `app/(app)/monitors/[id]/page.tsx` | new |
| `app/(app)/monitors/[id]/components/ChangesHistory.tsx` | new (client) |
| `app/(app)/dashboard/page.tsx` | modify — add feed section + clickable monitor names |
| `app/(app)/dashboard/components/ChangesFeed.tsx` | new (client) |

## Out of scope
- Real-time updates / polling
- Filtering by change type or date range
- Deleting change records
- Diff visualization beyond field: old → new
