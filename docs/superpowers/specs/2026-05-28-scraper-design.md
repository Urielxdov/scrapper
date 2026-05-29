# NestJS Web Scraper — Design Spec

**Date:** 2026-05-28
**Status:** Approved
**Framework pivot:** NestJS → Next.js 14 (App Router, full-stack)

---

## Overview

Sistema de monitoreo web full-stack con Next.js 14. Scrapea URLs configuradas por usuarios en frecuencias programadas. Detecta cambios en selectores CSS y notifica por email. Arquitectura Clean + Hexagonal en `src/lib/`, Route Handlers como presentación, worker BullMQ como proceso separado. Frontend React puro (client components), sin SSR/SEO.

---

## Stack

| Concern | Tech |
|---------|------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Auth | Auth.js v5 (NextAuth) — JWT strategy |
| PostgreSQL ORM | Prisma |
| MongoDB ODM | Mongoose |
| Queue / Scheduler | BullMQ |
| Cache / Jobs store | Redis |
| Static scraping | Axios + Cheerio |
| Dynamic scraping | Playwright (proceso worker) |
| Notifications | Nodemailer |
| UI | React (client components) + Tailwind CSS |

---

## Repository Structure

```
/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/route.ts   # Auth.js handler
│   │   │   ├── monitors/
│   │   │   │   ├── route.ts                 # GET list, POST create
│   │   │   │   └── [id]/route.ts            # GET, PATCH, DELETE
│   │   │   └── targets/
│   │   │       └── [id]/
│   │   │           └── history/route.ts     # GET scraped docs (MongoDB)
│   │   ├── dashboard/
│   │   │   └── page.tsx                     # UI principal (client)
│   │   ├── layout.tsx
│   │   └── page.tsx                         # Redirect a /dashboard
│   ├── lib/                                 # Lógica hexagonal compartida
│   │   ├── auth/
│   │   │   ├── domain/
│   │   │   │   ├── entities/user.entity.ts
│   │   │   │   └── ports/
│   │   │   │       ├── user-repository.port.ts
│   │   │   │       ├── hash.port.ts
│   │   │   │       └── token.port.ts
│   │   │   ├── application/
│   │   │   │   └── use-cases/
│   │   │   │       ├── register.use-case.ts
│   │   │   │       └── login.use-case.ts
│   │   │   └── infrastructure/
│   │   │       ├── repositories/prisma-user.repository.ts
│   │   │       └── adapters/
│   │   │           ├── bcrypt.adapter.ts
│   │   │           └── authjs.config.ts     # Auth.js config + JWT adapter
│   │   ├── monitoring/
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   ├── monitor.entity.ts
│   │   │   │   │   └── target.entity.ts
│   │   │   │   └── ports/
│   │   │   │       ├── monitor-repository.port.ts
│   │   │   │       ├── target-repository.port.ts
│   │   │   │       └── job-scheduler.port.ts
│   │   │   ├── application/
│   │   │   │   └── use-cases/
│   │   │   │       ├── create-monitor.use-case.ts
│   │   │   │       ├── list-monitors.use-case.ts
│   │   │   │       ├── get-monitor.use-case.ts
│   │   │   │       ├── update-monitor.use-case.ts
│   │   │   │       └── delete-monitor.use-case.ts
│   │   │   └── infrastructure/
│   │   │       ├── repositories/
│   │   │       │   ├── prisma-monitor.repository.ts
│   │   │       │   └── prisma-target.repository.ts
│   │   │       └── adapters/bullmq-job-scheduler.adapter.ts
│   │   ├── scraping/
│   │   │   ├── domain/
│   │   │   │   ├── entities/scraped-document.entity.ts
│   │   │   │   └── ports/
│   │   │   │       ├── scraper-strategy.port.ts
│   │   │   │       └── scraped-document-repository.port.ts
│   │   │   ├── application/
│   │   │   │   └── use-cases/scrape-target.use-case.ts
│   │   │   └── infrastructure/
│   │   │       ├── repositories/mongoose-scraped-document.repository.ts
│   │   │       ├── schemas/scraped-document.schema.ts
│   │   │       └── adapters/
│   │   │           ├── static-scraper.adapter.ts
│   │   │           └── dynamic-scraper.adapter.ts
│   │   └── notifications/
│   │       ├── domain/ports/notification.port.ts
│   │       ├── application/use-cases/notify-change.use-case.ts
│   │       └── infrastructure/adapters/nodemailer.adapter.ts
│   ├── types/                               # Tipos TS compartidos frontend ↔ backend
│   │   ├── monitor.types.ts
│   │   ├── target.types.ts
│   │   └── api.types.ts
│   └── middleware.ts                        # Auth.js session check en rutas /api
├── worker/
│   └── index.ts                             # Proceso BullMQ independiente
├── prisma/
│   └── schema.prisma
├── .env
└── package.json
```

---

## Data Models

### PostgreSQL (Prisma)

```prisma
model User {
  id        String    @id @default(uuid())
  email     String    @unique
  password  String
  role      Role      @default(USER)
  monitors  Monitor[]
  createdAt DateTime  @default(now())
}

enum Role { ADMIN USER }

model Target {
  id        String    @id @default(uuid())
  url       String    @unique
  selectors Json      // SelectorConfig[] — union de selectores de todos los usuarios
  frequency Int       // minutos — mínimo entre todos los monitores activos
  lastRunAt DateTime?
  monitors  Monitor[]
  changes   Change[]
  createdAt DateTime  @default(now())
}

model Monitor {
  id        String   @id @default(uuid())
  name      String?
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  targetId  String
  target    Target   @relation(fields: [targetId], references: [id])
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())

  @@unique([userId, targetId])
}

model Change {
  id         String     @id @default(uuid())
  targetId   String
  target     Target     @relation(fields: [targetId], references: [id])
  type       ChangeType @default(CONTENT_DIFF)
  diff       Json       // DiffEntry[]
  detectedAt DateTime   @default(now())
}

enum ChangeType { CONTENT_DIFF SELECTOR_MISSING }
```

**Tipos compartidos (`src/types/`):**

```ts
type SelectorConfig = { field: string; css: string };
type DiffEntry = { field: string; oldValue: string; newValue: string };
```

### MongoDB (Mongoose)

```ts
// Collection: scraped_documents
{
  targetId: string,
  url: string,
  rawHtml: string,
  extractedData: Record<string, string>,
  scrapeStrategy: 'static' | 'dynamic',
  scrapedAt: Date,
}
```

### Redis (BullMQ)

```
Queue: scraping-jobs
Job payload: { targetId, url, selectors: SelectorConfig[] }
Repeat: cron expression derivada de Target.frequency (minutos)
One job per Target
```

---

## Auth

**Auth.js v5 con JWT strategy** (sin DB de sesiones — stateless).

```ts
// src/lib/auth/infrastructure/adapters/authjs.config.ts
export const authConfig = {
  providers: [CredentialsProvider(...)],
  session: { strategy: 'jwt' },
  callbacks: {
    jwt({ token, user }) { /* añade role al token */ },
    session({ session, token }) { /* expone role en session */ },
  }
}
```

**Middleware** (`src/middleware.ts`): protege `/api/*` (excepto `/api/auth/*`) verificando sesión Auth.js.

**Roles:**
- `USER` — CRUD sus monitors
- `ADMIN` — ve todos los targets, gestiona usuarios

---

## API Routes

```
POST   /api/auth/[...nextauth]   # register / login / logout (Auth.js)

POST   /api/monitors             # CreateMonitorUseCase
GET    /api/monitors             # ListMonitorsUseCase (usuario autenticado)
GET    /api/monitors/:id         # GetMonitorUseCase + últimos cambios
PATCH  /api/monitors/:id         # UpdateMonitorUseCase
DELETE /api/monitors/:id         # DeleteMonitorUseCase + cancela job si Target huérfano

GET    /api/targets/:id/history  # ScrapedDocuments paginados (MongoDB)
```

---

## Scraping Strategy (Hexagonal)

```ts
// src/lib/scraping/domain/ports/scraper-strategy.port.ts
interface ScraperStrategyPort {
  canHandle(url: string): Promise<boolean>;
  scrape(url: string, selectors: SelectorConfig[]): Promise<ScrapeResult>;
}

// Adapters en infrastructure:
// StaticScraperAdapter  → axios + cheerio (intenta primero)
// DynamicScraperAdapter → playwright (si static falla)
```

**ScrapeTarget use case** selecciona estrategia en orden: static → dynamic.

---

## Worker Process

`worker/index.ts` corre como proceso Node.js independiente:

```bash
# package.json scripts
"dev:worker": "tsx watch worker/index.ts"
"dev": "concurrently \"next dev\" \"npm run dev:worker\""
```

**Worker flow:**
1. Consume job `{ targetId, url, selectors }` de BullMQ
2. Llama `ScrapeTargetUseCase` → elige estrategia
3. Guarda `ScrapedDocument` en MongoDB
4. Recupera documento anterior
5. Calcula diff de `extractedData`
6. Verifica que selectores CSS existan en DOM
   - Si falta selector → `Change { type: SELECTOR_MISSING }`
7. Si hay diff → guarda `Change` en PostgreSQL
8. Si hay `Change` → `NotifyChangeUseCase` → email a usuarios del Target
9. Actualiza `Target.lastRunAt`

---

## CreateMonitorUseCase Logic

1. Busca `Target` por URL
2. Si no existe → crea con selectores y frecuencia
3. Si existe → merge de selectores (union por `field`), recalcula frecuencia mínima, actualiza
4. Crea `Monitor` `(userId, targetId)` — constraint `@@unique` previene duplicados
5. Upsert BullMQ job recurrente para `targetId`

---

## Notifications

`NotifyChangeUseCase`:
1. Recibe `Change` + `targetId`
2. Busca monitores activos del target → obtiene emails de usuarios
3. Formatea diff como HTML
4. Llama `INotificationPort.send()` por usuario

`NodemailerAdapter` implementa `INotificationPort`.

---

## Dependency Injection

Sin NestJS DI — factory functions manuales por módulo:

```ts
// src/lib/monitoring/infrastructure/container.ts
export function makeCreateMonitorUseCase() {
  const targetRepo = new PrismaTargetRepository(prisma);
  const monitorRepo = new PrismaMonitorRepository(prisma);
  const scheduler = new BullMQJobSchedulerAdapter(redisConnection);
  return new CreateMonitorUseCase(targetRepo, monitorRepo, scheduler);
}
```

Route Handlers llaman la factory para obtener el use case.

---

## Error Handling

- Scraping falla → BullMQ retry con backoff exponencial (3 intentos, delay 5s × 2^n)
- Playwright no disponible → fallback a static, flag `scrapeStrategy: 'static_fallback'`
- Selector desaparecido → `Change { type: SELECTOR_MISSING }` + email
- Email falla → log error, no bloquea el job

---

## Testing Strategy

- **Domain entities / value objects:** unit tests puros
- **Use cases:** unit tests con mocks de ports (jest.fn())
- **Adapters:** integration tests con DB real (docker-compose con PG + Mongo + Redis)
- **Route Handlers:** integration tests con `fetch` contra servidor Next.js de prueba
- **Worker:** integration tests con BullMQ + Redis real
