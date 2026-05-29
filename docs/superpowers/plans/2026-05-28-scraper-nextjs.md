# NestJS Web Scraper (Next.js) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack Next.js 14 web scraper that monitors URLs for CSS selector changes, stores results in PostgreSQL + MongoDB, runs scraping jobs via BullMQ worker, and notifies users by email.

**Architecture:** Clean + Hexagonal. Business logic in `src/lib/` (domain → application → infrastructure). Route Handlers as presentation layer. Separate `worker/index.ts` process for BullMQ jobs. Manual DI via factory functions.

**Tech Stack:** Next.js 14, TypeScript, Prisma (PostgreSQL), Mongoose (MongoDB), BullMQ (Redis), Axios, Cheerio, Playwright, Auth.js v5, Nodemailer, Tailwind CSS, Jest

---

## Task 1: Project Scaffold + Dependencies

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `.env.example`, `docker-compose.yml`

- [ ] **Step 1: Scaffold Next.js project**

```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

- [ ] **Step 2: Install backend dependencies**

```bash
npm install prisma @prisma/client mongoose bullmq axios cheerio playwright nodemailer bcryptjs next-auth@beta
npm install -D @types/nodemailer @types/bcryptjs tsx concurrently
```

- [ ] **Step 3: Install test dependencies**

```bash
npm install -D jest @types/jest ts-jest jest-environment-node @jest/globals
```

- [ ] **Step 4: Create `jest.config.ts`**

```ts
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testPathPattern: '.*\\.test\\.ts$',
};

export default config;
```

- [ ] **Step 5: Create `docker-compose.yml`**

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: scrapper
      POSTGRES_USER: scrapper
      POSTGRES_PASSWORD: scrapper
    ports:
      - "5432:5432"
  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

- [ ] **Step 6: Create `.env.example`**

```env
DATABASE_URL="postgresql://scrapper:scrapper@localhost:5432/scrapper"
MONGODB_URI="mongodb://localhost:27017/scrapper"
REDIS_URL="redis://localhost:6379"
NEXTAUTH_SECRET="change-me-in-production"
NEXTAUTH_URL="http://localhost:3000"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM=""
```

- [ ] **Step 7: Copy `.env.example` to `.env` and fill values**

```bash
cp .env.example .env
```

- [ ] **Step 8: Add scripts to `package.json`**

```json
{
  "scripts": {
    "dev": "concurrently \"next dev\" \"npm run dev:worker\"",
    "dev:worker": "tsx watch worker/index.ts",
    "build": "next build",
    "start": "next start",
    "test": "jest",
    "test:watch": "jest --watch",
    "db:up": "docker-compose up -d",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate"
  }
}
```

- [ ] **Step 9: Start DB containers**

```bash
npm run db:up
```

Expected: postgres, mongo, redis containers running.

- [ ] **Step 10: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Next.js project with dependencies"
```

---

## Task 2: Prisma Schema + Migration

**Files:**
- Create: `prisma/schema.prisma`

- [ ] **Step 1: Init Prisma**

```bash
npx prisma init
```

- [ ] **Step 2: Replace `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

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
  selectors Json
  frequency Int
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
  diff       Json
  detectedAt DateTime   @default(now())
}

enum ChangeType { CONTENT_DIFF SELECTOR_MISSING }
```

- [ ] **Step 3: Run migration**

```bash
npm run db:migrate -- --name init
npm run db:generate
```

Expected: `prisma/migrations/` created, no errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/
git commit -m "feat: add prisma schema with User, Target, Monitor, Change"
```

---

## Task 3: Shared Types + Infrastructure Singletons

**Files:**
- Create: `src/types/monitor.types.ts`
- Create: `src/lib/shared/prisma.ts`
- Create: `src/lib/shared/mongoose.ts`
- Create: `src/lib/shared/redis.ts`

- [ ] **Step 1: Create shared types**

```ts
// src/types/monitor.types.ts
export type SelectorConfig = { field: string; css: string };
export type DiffEntry = { field: string; oldValue: string; newValue: string };
export type ChangeType = 'CONTENT_DIFF' | 'SELECTOR_MISSING';
export type Role = 'ADMIN' | 'USER';

export type ScrapeResult = {
  extractedData: Record<string, string>;
  rawHtml: string;
  strategy: 'static' | 'dynamic';
};
```

- [ ] **Step 2: Create Prisma singleton**

```ts
// src/lib/shared/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['error'] : [] });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

- [ ] **Step 3: Create Mongoose singleton**

```ts
// src/lib/shared/mongoose.ts
import mongoose from 'mongoose';

let isConnected = false;

export async function connectMongoDB(): Promise<void> {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI!);
  isConnected = true;
}
```

- [ ] **Step 4: Create Redis connection**

```ts
// src/lib/shared/redis.ts
import { Redis } from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL!);
```

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat: add shared types and infrastructure singletons"
```

---

## Task 4: Auth Domain

**Files:**
- Create: `src/lib/auth/domain/entities/user.entity.ts`
- Create: `src/lib/auth/domain/ports/user-repository.port.ts`
- Create: `src/lib/auth/domain/ports/hash.port.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/auth/domain/entities/user.entity.test.ts
import { User } from './user.entity';

describe('User entity', () => {
  it('creates valid user', () => {
    const user = new User('uuid-1', 'test@test.com', 'hashed', 'USER');
    expect(user.email).toBe('test@test.com');
    expect(user.role).toBe('USER');
  });

  it('rejects invalid email', () => {
    expect(() => new User('uuid-1', 'not-an-email', 'hashed', 'USER'))
      .toThrow('Invalid email');
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- user.entity.test.ts
```

Expected: FAIL — "Cannot find module"

- [ ] **Step 3: Implement User entity**

```ts
// src/lib/auth/domain/entities/user.entity.ts
import { Role } from '@/types/monitor.types';

export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly password: string,
    public readonly role: Role,
    public readonly createdAt: Date = new Date(),
  ) {
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) throw new Error('Invalid email');
  }
}
```

- [ ] **Step 4: Create ports**

```ts
// src/lib/auth/domain/ports/user-repository.port.ts
import { User } from '../entities/user.entity';

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<User>;
}
```

```ts
// src/lib/auth/domain/ports/hash.port.ts
export interface IHashPort {
  hash(plain: string): Promise<string>;
  compare(plain: string, hashed: string): Promise<boolean>;
}
```

- [ ] **Step 5: Run test — expect PASS**

```bash
npm test -- user.entity.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth/
git commit -m "feat: add User domain entity and ports"
```

---

## Task 5: Auth Use Cases

**Files:**
- Create: `src/lib/auth/application/use-cases/register.use-case.ts`
- Create: `src/lib/auth/application/use-cases/login.use-case.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/auth/application/use-cases/register.use-case.test.ts
import { RegisterUseCase } from './register.use-case';
import { IUserRepository } from '../../domain/ports/user-repository.port';
import { IHashPort } from '../../domain/ports/hash.port';
import { User } from '../../domain/entities/user.entity';

describe('RegisterUseCase', () => {
  let useCase: RegisterUseCase;
  let userRepo: jest.Mocked<IUserRepository>;
  let hashPort: jest.Mocked<IHashPort>;

  beforeEach(() => {
    userRepo = { findByEmail: jest.fn(), findById: jest.fn(), save: jest.fn() };
    hashPort = { hash: jest.fn(), compare: jest.fn() };
    useCase = new RegisterUseCase(userRepo, hashPort);
  });

  it('registers a new user and returns it', async () => {
    userRepo.findByEmail.mockResolvedValue(null);
    hashPort.hash.mockResolvedValue('hashed-pw');
    userRepo.save.mockImplementation(async (u) => u);

    const result = await useCase.execute({ email: 'a@b.com', password: '123456' });

    expect(hashPort.hash).toHaveBeenCalledWith('123456');
    expect(result.email).toBe('a@b.com');
  });

  it('throws ConflictError if email already taken', async () => {
    userRepo.findByEmail.mockResolvedValue(
      new User('id', 'a@b.com', 'pw', 'USER')
    );
    await expect(useCase.execute({ email: 'a@b.com', password: '123' }))
      .rejects.toThrow('Email already in use');
  });
});
```

```ts
// src/lib/auth/application/use-cases/login.use-case.test.ts
import { LoginUseCase } from './login.use-case';
import { IUserRepository } from '../../domain/ports/user-repository.port';
import { IHashPort } from '../../domain/ports/hash.port';
import { User } from '../../domain/entities/user.entity';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let userRepo: jest.Mocked<IUserRepository>;
  let hashPort: jest.Mocked<IHashPort>;

  beforeEach(() => {
    userRepo = { findByEmail: jest.fn(), findById: jest.fn(), save: jest.fn() };
    hashPort = { hash: jest.fn(), compare: jest.fn() };
    useCase = new LoginUseCase(userRepo, hashPort);
  });

  it('returns user when credentials are valid', async () => {
    userRepo.findByEmail.mockResolvedValue(new User('id', 'a@b.com', 'hashed', 'USER'));
    hashPort.compare.mockResolvedValue(true);

    const result = await useCase.execute({ email: 'a@b.com', password: '123456' });
    expect(result.id).toBe('id');
  });

  it('returns null when password is wrong', async () => {
    userRepo.findByEmail.mockResolvedValue(new User('id', 'a@b.com', 'hashed', 'USER'));
    hashPort.compare.mockResolvedValue(false);

    const result = await useCase.execute({ email: 'a@b.com', password: 'wrong' });
    expect(result).toBeNull();
  });

  it('returns null when user not found', async () => {
    userRepo.findByEmail.mockResolvedValue(null);
    const result = await useCase.execute({ email: 'x@y.com', password: '123' });
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- register.use-case.test.ts login.use-case.test.ts
```

- [ ] **Step 3: Implement RegisterUseCase**

```ts
// src/lib/auth/application/use-cases/register.use-case.ts
import { User } from '../../domain/entities/user.entity';
import { IUserRepository } from '../../domain/ports/user-repository.port';
import { IHashPort } from '../../domain/ports/hash.port';

type RegisterInput = { email: string; password: string };

export class RegisterUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly hashPort: IHashPort,
  ) {}

  async execute(input: RegisterInput): Promise<User> {
    const existing = await this.userRepo.findByEmail(input.email);
    if (existing) throw new Error('Email already in use');
    const hashed = await this.hashPort.hash(input.password);
    const user = new User(crypto.randomUUID(), input.email, hashed, 'USER');
    return this.userRepo.save(user);
  }
}
```

- [ ] **Step 4: Implement LoginUseCase**

```ts
// src/lib/auth/application/use-cases/login.use-case.ts
import { User } from '../../domain/entities/user.entity';
import { IUserRepository } from '../../domain/ports/user-repository.port';
import { IHashPort } from '../../domain/ports/hash.port';

type LoginInput = { email: string; password: string };

export class LoginUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly hashPort: IHashPort,
  ) {}

  async execute(input: LoginInput): Promise<User | null> {
    const user = await this.userRepo.findByEmail(input.email);
    if (!user) return null;
    const valid = await this.hashPort.compare(input.password, user.password);
    return valid ? user : null;
  }
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npm test -- register.use-case.test.ts login.use-case.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth/application/
git commit -m "feat: add RegisterUseCase and LoginUseCase with tests"
```

---

## Task 6: Auth Infrastructure (BcryptAdapter + PrismaUserRepository)

**Files:**
- Create: `src/lib/auth/infrastructure/adapters/bcrypt.adapter.ts`
- Create: `src/lib/auth/infrastructure/repositories/prisma-user.repository.ts`

- [ ] **Step 1: Write failing test for BcryptAdapter**

```ts
// src/lib/auth/infrastructure/adapters/bcrypt.adapter.test.ts
import { BcryptAdapter } from './bcrypt.adapter';

describe('BcryptAdapter', () => {
  const adapter = new BcryptAdapter();

  it('hashes and compares correctly', async () => {
    const hashed = await adapter.hash('my-password');
    expect(hashed).not.toBe('my-password');
    expect(await adapter.compare('my-password', hashed)).toBe(true);
    expect(await adapter.compare('wrong', hashed)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- bcrypt.adapter.test.ts
```

- [ ] **Step 3: Implement BcryptAdapter**

```ts
// src/lib/auth/infrastructure/adapters/bcrypt.adapter.ts
import bcrypt from 'bcryptjs';
import { IHashPort } from '../../domain/ports/hash.port';

export class BcryptAdapter implements IHashPort {
  private readonly rounds = 12;

  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.rounds);
  }

  async compare(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- bcrypt.adapter.test.ts
```

- [ ] **Step 5: Implement PrismaUserRepository**

```ts
// src/lib/auth/infrastructure/repositories/prisma-user.repository.ts
import { PrismaClient } from '@prisma/client';
import { User } from '../../domain/entities/user.entity';
import { IUserRepository } from '../../domain/ports/user-repository.port';
import { Role } from '@/types/monitor.types';

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.db.user.findUnique({ where: { email } });
    return row ? new User(row.id, row.email, row.password, row.role as Role, row.createdAt) : null;
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.db.user.findUnique({ where: { id } });
    return row ? new User(row.id, row.email, row.password, row.role as Role, row.createdAt) : null;
  }

  async save(user: User): Promise<User> {
    const row = await this.db.user.upsert({
      where: { id: user.id },
      update: { email: user.email, password: user.password, role: user.role },
      create: { id: user.id, email: user.email, password: user.password, role: user.role },
    });
    return new User(row.id, row.email, row.password, row.role as Role, row.createdAt);
  }
}
```

- [ ] **Step 6: Create auth container (DI factory)**

```ts
// src/lib/auth/infrastructure/container.ts
import { prisma } from '@/lib/shared/prisma';
import { BcryptAdapter } from './adapters/bcrypt.adapter';
import { PrismaUserRepository } from './repositories/prisma-user.repository';
import { RegisterUseCase } from '../application/use-cases/register.use-case';
import { LoginUseCase } from '../application/use-cases/login.use-case';

export function makeAuthUseCases() {
  const userRepo = new PrismaUserRepository(prisma);
  const hashPort = new BcryptAdapter();
  return {
    register: new RegisterUseCase(userRepo, hashPort),
    login: new LoginUseCase(userRepo, hashPort),
  };
}
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/auth/infrastructure/
git commit -m "feat: add BcryptAdapter, PrismaUserRepository and auth container"
```

---

## Task 7: Auth.js Config + API Route

**Files:**
- Create: `src/lib/auth/infrastructure/adapters/authjs.config.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Create Auth.js config**

```ts
// src/lib/auth/infrastructure/adapters/authjs.config.ts
import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { makeAuthUseCases } from '../container';

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const { login } = makeAuthUseCases();
        const user = await login.execute({
          email: credentials.email as string,
          password: credentials.password as string,
        });
        if (!user) return null;
        return { id: user.id, email: user.email, role: user.role };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = (user as { role: string }).role;
      return token;
    },
    session({ session, token }) {
      if (session.user) (session.user as { role?: string }).role = token.role as string;
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
```

- [ ] **Step 2: Create Auth.js route handler**

```ts
// src/app/api/auth/[...nextauth]/route.ts
export { handlers as GET, handlers as POST } from '@/lib/auth/infrastructure/adapters/authjs.config';
```

- [ ] **Step 3: Create register endpoint**

```ts
// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { makeAuthUseCases } from '@/lib/auth/infrastructure/container';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: 'email and password required' }, { status: 400 });
  }

  try {
    const { register } = makeAuthUseCases();
    const user = await register.execute({ email, password });
    return NextResponse.json({ id: user.id, email: user.email, role: user.role }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message === 'Email already in use' ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
```

- [ ] **Step 4: Create middleware to protect API routes**

```ts
// src/middleware.ts
import { auth } from '@/lib/auth/infrastructure/adapters/authjs.config';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isAuthRoute = req.nextUrl.pathname.startsWith('/api/auth');
  if (!isAuthRoute && !req.auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.next();
});

export const config = {
  matcher: ['/api/:path*'],
};
```

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat: add Auth.js config, register endpoint and API middleware"
```

---

## Task 8: Monitoring Domain

**Files:**
- Create: `src/lib/monitoring/domain/entities/target.entity.ts`
- Create: `src/lib/monitoring/domain/entities/monitor.entity.ts`
- Create: `src/lib/monitoring/domain/ports/target-repository.port.ts`
- Create: `src/lib/monitoring/domain/ports/monitor-repository.port.ts`
- Create: `src/lib/monitoring/domain/ports/job-scheduler.port.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/monitoring/domain/entities/target.entity.test.ts
import { Target } from './target.entity';

describe('Target entity', () => {
  it('creates target with merged selectors', () => {
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
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test -- target.entity.test.ts
```

- [ ] **Step 3: Implement Target entity**

```ts
// src/lib/monitoring/domain/entities/target.entity.ts
import { SelectorConfig } from '@/types/monitor.types';

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
```

- [ ] **Step 4: Implement Monitor entity**

```ts
// src/lib/monitoring/domain/entities/monitor.entity.ts
export class Monitor {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly targetId: string,
    public readonly isActive: boolean = true,
    public readonly name: string | null = null,
    public readonly createdAt: Date = new Date(),
  ) {}
}
```

- [ ] **Step 5: Create ports**

```ts
// src/lib/monitoring/domain/ports/target-repository.port.ts
import { Target } from '../entities/target.entity';
import { SelectorConfig } from '@/types/monitor.types';

export interface ITargetRepository {
  findByUrl(url: string): Promise<Target | null>;
  findById(id: string): Promise<Target | null>;
  save(target: Target): Promise<Target>;
  update(id: string, data: Partial<{ selectors: SelectorConfig[]; frequency: number; lastRunAt: Date }>): Promise<Target>;
}
```

```ts
// src/lib/monitoring/domain/ports/monitor-repository.port.ts
import { Monitor } from '../entities/monitor.entity';

export interface IMonitorRepository {
  findByUserAndTarget(userId: string, targetId: string): Promise<Monitor | null>;
  findByUserId(userId: string): Promise<Monitor[]>;
  findByTargetId(targetId: string): Promise<Monitor[]>;
  findById(id: string): Promise<Monitor | null>;
  save(monitor: Monitor): Promise<Monitor>;
  update(id: string, data: Partial<{ isActive: boolean; name: string }>): Promise<Monitor>;
  delete(id: string): Promise<void>;
}
```

```ts
// src/lib/monitoring/domain/ports/job-scheduler.port.ts
export interface IJobSchedulerPort {
  upsert(targetId: string, frequencyMinutes: number, payload: object): Promise<void>;
  remove(targetId: string): Promise<void>;
}
```

- [ ] **Step 6: Run tests — expect PASS**

```bash
npm test -- target.entity.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/monitoring/domain/
git commit -m "feat: add monitoring domain entities and ports"
```

---

## Task 9: CreateMonitorUseCase

**Files:**
- Create: `src/lib/monitoring/application/use-cases/create-monitor.use-case.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/monitoring/application/use-cases/create-monitor.use-case.test.ts
import { CreateMonitorUseCase } from './create-monitor.use-case';
import { ITargetRepository } from '../../domain/ports/target-repository.port';
import { IMonitorRepository } from '../../domain/ports/monitor-repository.port';
import { IJobSchedulerPort } from '../../domain/ports/job-scheduler.port';
import { Target } from '../../domain/entities/target.entity';
import { Monitor } from '../../domain/entities/monitor.entity';

describe('CreateMonitorUseCase', () => {
  let useCase: CreateMonitorUseCase;
  let targetRepo: jest.Mocked<ITargetRepository>;
  let monitorRepo: jest.Mocked<IMonitorRepository>;
  let scheduler: jest.Mocked<IJobSchedulerPort>;

  beforeEach(() => {
    targetRepo = { findByUrl: jest.fn(), findById: jest.fn(), save: jest.fn(), update: jest.fn() };
    monitorRepo = {
      findByUserAndTarget: jest.fn(), findByUserId: jest.fn(), findByTargetId: jest.fn(),
      findById: jest.fn(), save: jest.fn(), update: jest.fn(), delete: jest.fn(),
    };
    scheduler = { upsert: jest.fn(), remove: jest.fn() };
    useCase = new CreateMonitorUseCase(targetRepo, monitorRepo, scheduler);
  });

  it('creates target and monitor when URL is new', async () => {
    targetRepo.findByUrl.mockResolvedValue(null);
    targetRepo.save.mockImplementation(async (t) => t);
    monitorRepo.findByUserAndTarget.mockResolvedValue(null);
    monitorRepo.save.mockImplementation(async (m) => m);

    const result = await useCase.execute({
      userId: 'user-1',
      url: 'https://example.com',
      selectors: [{ field: 'price', css: '.price' }],
      frequencyMinutes: 60,
    });

    expect(targetRepo.save).toHaveBeenCalled();
    expect(monitorRepo.save).toHaveBeenCalled();
    expect(scheduler.upsert).toHaveBeenCalledWith(expect.any(String), 60, expect.any(Object));
    expect(result.userId).toBe('user-1');
  });

  it('reuses existing target and merges selectors', async () => {
    const existing = new Target('t-1', 'https://example.com', [{ field: 'price', css: '.old' }], 120);
    targetRepo.findByUrl.mockResolvedValue(existing);
    targetRepo.update.mockImplementation(async (id, data) =>
      new Target(id, 'https://example.com', data.selectors!, data.frequency!, null)
    );
    monitorRepo.findByUserAndTarget.mockResolvedValue(null);
    monitorRepo.save.mockImplementation(async (m) => m);

    await useCase.execute({
      userId: 'user-1',
      url: 'https://example.com',
      selectors: [{ field: 'price', css: '.new' }],
      frequencyMinutes: 30,
    });

    expect(targetRepo.update).toHaveBeenCalledWith('t-1', expect.objectContaining({ frequency: 30 }));
  });

  it('throws if monitor already exists for user+target', async () => {
    const existing = new Target('t-1', 'https://example.com', [], 60);
    targetRepo.findByUrl.mockResolvedValue(existing);
    targetRepo.update.mockResolvedValue(existing);
    monitorRepo.findByUserAndTarget.mockResolvedValue(new Monitor('m-1', 'user-1', 't-1'));

    await expect(useCase.execute({
      userId: 'user-1',
      url: 'https://example.com',
      selectors: [],
      frequencyMinutes: 60,
    })).rejects.toThrow('Monitor already exists');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test -- create-monitor.use-case.test.ts
```

- [ ] **Step 3: Implement**

```ts
// src/lib/monitoring/application/use-cases/create-monitor.use-case.ts
import { Target } from '../../domain/entities/target.entity';
import { Monitor } from '../../domain/entities/monitor.entity';
import { ITargetRepository } from '../../domain/ports/target-repository.port';
import { IMonitorRepository } from '../../domain/ports/monitor-repository.port';
import { IJobSchedulerPort } from '../../domain/ports/job-scheduler.port';
import { SelectorConfig } from '@/types/monitor.types';

type CreateMonitorInput = {
  userId: string;
  url: string;
  selectors: SelectorConfig[];
  frequencyMinutes: number;
  name?: string;
};

export class CreateMonitorUseCase {
  constructor(
    private readonly targetRepo: ITargetRepository,
    private readonly monitorRepo: IMonitorRepository,
    private readonly scheduler: IJobSchedulerPort,
  ) {}

  async execute(input: CreateMonitorInput): Promise<Monitor> {
    let target = await this.targetRepo.findByUrl(input.url);

    if (!target) {
      const newTarget = new Target(
        crypto.randomUUID(), input.url, input.selectors, input.frequencyMinutes
      );
      target = await this.targetRepo.save(newTarget);
    } else {
      const mergedSelectors = target.mergeSelectors(input.selectors);
      const newFrequency = Math.min(target.frequency, input.frequencyMinutes);
      target = await this.targetRepo.update(target.id, {
        selectors: mergedSelectors,
        frequency: newFrequency,
      });
    }

    const existing = await this.monitorRepo.findByUserAndTarget(input.userId, target.id);
    if (existing) throw new Error('Monitor already exists');

    const monitor = new Monitor(
      crypto.randomUUID(), input.userId, target.id, true, input.name ?? null
    );
    const saved = await this.monitorRepo.save(monitor);

    await this.scheduler.upsert(target.id, target.frequency, {
      targetId: target.id, url: target.url, selectors: target.selectors,
    });

    return saved;
  }
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npm test -- create-monitor.use-case.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/monitoring/application/
git commit -m "feat: add CreateMonitorUseCase with tests"
```

---

## Task 10: Remaining Monitor Use Cases

**Files:**
- Create: `src/lib/monitoring/application/use-cases/list-monitors.use-case.ts`
- Create: `src/lib/monitoring/application/use-cases/get-monitor.use-case.ts`
- Create: `src/lib/monitoring/application/use-cases/update-monitor.use-case.ts`
- Create: `src/lib/monitoring/application/use-cases/delete-monitor.use-case.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/monitoring/application/use-cases/list-monitors.use-case.test.ts
import { ListMonitorsUseCase } from './list-monitors.use-case';
import { IMonitorRepository } from '../../domain/ports/monitor-repository.port';
import { Monitor } from '../../domain/entities/monitor.entity';

describe('ListMonitorsUseCase', () => {
  it('returns monitors for user', async () => {
    const repo: jest.Mocked<IMonitorRepository> = {
      findByUserId: jest.fn().mockResolvedValue([new Monitor('m1', 'u1', 't1')]),
      findByUserAndTarget: jest.fn(), findByTargetId: jest.fn(), findById: jest.fn(),
      save: jest.fn(), update: jest.fn(), delete: jest.fn(),
    };
    const uc = new ListMonitorsUseCase(repo);
    const result = await uc.execute('u1');
    expect(result).toHaveLength(1);
    expect(repo.findByUserId).toHaveBeenCalledWith('u1');
  });
});
```

```ts
// src/lib/monitoring/application/use-cases/delete-monitor.use-case.test.ts
import { DeleteMonitorUseCase } from './delete-monitor.use-case';
import { IMonitorRepository } from '../../domain/ports/monitor-repository.port';
import { ITargetRepository } from '../../domain/ports/target-repository.port';
import { IJobSchedulerPort } from '../../domain/ports/job-scheduler.port';
import { Monitor } from '../../domain/entities/monitor.entity';
import { Target } from '../../domain/entities/target.entity';

describe('DeleteMonitorUseCase', () => {
  let monitorRepo: jest.Mocked<IMonitorRepository>;
  let targetRepo: jest.Mocked<ITargetRepository>;
  let scheduler: jest.Mocked<IJobSchedulerPort>;

  beforeEach(() => {
    monitorRepo = {
      findById: jest.fn(), findByUserId: jest.fn(), findByTargetId: jest.fn(),
      findByUserAndTarget: jest.fn(), save: jest.fn(), update: jest.fn(), delete: jest.fn(),
    };
    targetRepo = { findByUrl: jest.fn(), findById: jest.fn(), save: jest.fn(), update: jest.fn() };
    scheduler = { upsert: jest.fn(), remove: jest.fn() };
  });

  it('deletes monitor and removes job if target has no more monitors', async () => {
    monitorRepo.findById.mockResolvedValue(new Monitor('m1', 'u1', 't1'));
    monitorRepo.findByTargetId.mockResolvedValue([]);
    const uc = new DeleteMonitorUseCase(monitorRepo, targetRepo, scheduler);

    await uc.execute('m1', 'u1');

    expect(monitorRepo.delete).toHaveBeenCalledWith('m1');
    expect(scheduler.remove).toHaveBeenCalledWith('t1');
  });

  it('keeps job if other monitors still watch the target', async () => {
    monitorRepo.findById.mockResolvedValue(new Monitor('m1', 'u1', 't1'));
    monitorRepo.findByTargetId.mockResolvedValue([new Monitor('m2', 'u2', 't1')]);
    const uc = new DeleteMonitorUseCase(monitorRepo, targetRepo, scheduler);

    await uc.execute('m1', 'u1');

    expect(scheduler.remove).not.toHaveBeenCalled();
  });

  it('throws if monitor not found or wrong user', async () => {
    monitorRepo.findById.mockResolvedValue(new Monitor('m1', 'other-user', 't1'));
    const uc = new DeleteMonitorUseCase(monitorRepo, targetRepo, scheduler);
    await expect(uc.execute('m1', 'u1')).rejects.toThrow('Not found');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test -- list-monitors.use-case.test.ts delete-monitor.use-case.test.ts
```

- [ ] **Step 3: Implement all use cases**

```ts
// src/lib/monitoring/application/use-cases/list-monitors.use-case.ts
import { Monitor } from '../../domain/entities/monitor.entity';
import { IMonitorRepository } from '../../domain/ports/monitor-repository.port';

export class ListMonitorsUseCase {
  constructor(private readonly monitorRepo: IMonitorRepository) {}
  async execute(userId: string): Promise<Monitor[]> {
    return this.monitorRepo.findByUserId(userId);
  }
}
```

```ts
// src/lib/monitoring/application/use-cases/get-monitor.use-case.ts
import { Monitor } from '../../domain/entities/monitor.entity';
import { IMonitorRepository } from '../../domain/ports/monitor-repository.port';

export class GetMonitorUseCase {
  constructor(private readonly monitorRepo: IMonitorRepository) {}
  async execute(id: string, userId: string): Promise<Monitor> {
    const monitor = await this.monitorRepo.findById(id);
    if (!monitor || monitor.userId !== userId) throw new Error('Not found');
    return monitor;
  }
}
```

```ts
// src/lib/monitoring/application/use-cases/update-monitor.use-case.ts
import { Monitor } from '../../domain/entities/monitor.entity';
import { IMonitorRepository } from '../../domain/ports/monitor-repository.port';

type UpdateInput = { name?: string; isActive?: boolean };

export class UpdateMonitorUseCase {
  constructor(private readonly monitorRepo: IMonitorRepository) {}
  async execute(id: string, userId: string, data: UpdateInput): Promise<Monitor> {
    const monitor = await this.monitorRepo.findById(id);
    if (!monitor || monitor.userId !== userId) throw new Error('Not found');
    return this.monitorRepo.update(id, data);
  }
}
```

```ts
// src/lib/monitoring/application/use-cases/delete-monitor.use-case.ts
import { IMonitorRepository } from '../../domain/ports/monitor-repository.port';
import { ITargetRepository } from '../../domain/ports/target-repository.port';
import { IJobSchedulerPort } from '../../domain/ports/job-scheduler.port';

export class DeleteMonitorUseCase {
  constructor(
    private readonly monitorRepo: IMonitorRepository,
    private readonly targetRepo: ITargetRepository,
    private readonly scheduler: IJobSchedulerPort,
  ) {}

  async execute(id: string, userId: string): Promise<void> {
    const monitor = await this.monitorRepo.findById(id);
    if (!monitor || monitor.userId !== userId) throw new Error('Not found');

    await this.monitorRepo.delete(id);

    const remaining = await this.monitorRepo.findByTargetId(monitor.targetId);
    if (remaining.length === 0) await this.scheduler.remove(monitor.targetId);
  }
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npm test -- list-monitors.use-case.test.ts delete-monitor.use-case.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/monitoring/application/
git commit -m "feat: add list, get, update, delete monitor use cases"
```

---

## Task 11: Monitoring Infrastructure (Prisma Repos + BullMQ Scheduler)

**Files:**
- Create: `src/lib/monitoring/infrastructure/repositories/prisma-target.repository.ts`
- Create: `src/lib/monitoring/infrastructure/repositories/prisma-monitor.repository.ts`
- Create: `src/lib/monitoring/infrastructure/adapters/bullmq-job-scheduler.adapter.ts`
- Create: `src/lib/monitoring/infrastructure/container.ts`

- [ ] **Step 1: Implement PrismaTargetRepository**

```ts
// src/lib/monitoring/infrastructure/repositories/prisma-target.repository.ts
import { PrismaClient } from '@prisma/client';
import { Target } from '../../domain/entities/target.entity';
import { ITargetRepository } from '../../domain/ports/target-repository.port';
import { SelectorConfig } from '@/types/monitor.types';

function toEntity(row: { id: string; url: string; selectors: unknown; frequency: number; lastRunAt: Date | null; createdAt: Date }): Target {
  return new Target(
    row.id, row.url, row.selectors as SelectorConfig[],
    row.frequency, row.lastRunAt, row.createdAt,
  );
}

export class PrismaTargetRepository implements ITargetRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByUrl(url: string): Promise<Target | null> {
    const row = await this.db.target.findUnique({ where: { url } });
    return row ? toEntity(row) : null;
  }

  async findById(id: string): Promise<Target | null> {
    const row = await this.db.target.findUnique({ where: { id } });
    return row ? toEntity(row) : null;
  }

  async save(target: Target): Promise<Target> {
    const row = await this.db.target.create({
      data: {
        id: target.id, url: target.url,
        selectors: target.selectors, frequency: target.frequency,
      },
    });
    return toEntity(row);
  }

  async update(id: string, data: Partial<{ selectors: SelectorConfig[]; frequency: number; lastRunAt: Date }>): Promise<Target> {
    const row = await this.db.target.update({ where: { id }, data });
    return toEntity(row);
  }
}
```

- [ ] **Step 2: Implement PrismaMonitorRepository**

```ts
// src/lib/monitoring/infrastructure/repositories/prisma-monitor.repository.ts
import { PrismaClient } from '@prisma/client';
import { Monitor } from '../../domain/entities/monitor.entity';
import { IMonitorRepository } from '../../domain/ports/monitor-repository.port';

function toEntity(row: { id: string; userId: string; targetId: string; isActive: boolean; name: string | null; createdAt: Date }): Monitor {
  return new Monitor(row.id, row.userId, row.targetId, row.isActive, row.name, row.createdAt);
}

export class PrismaMonitorRepository implements IMonitorRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByUserAndTarget(userId: string, targetId: string): Promise<Monitor | null> {
    const row = await this.db.monitor.findUnique({ where: { userId_targetId: { userId, targetId } } });
    return row ? toEntity(row) : null;
  }

  async findByUserId(userId: string): Promise<Monitor[]> {
    const rows = await this.db.monitor.findMany({ where: { userId } });
    return rows.map(toEntity);
  }

  async findByTargetId(targetId: string): Promise<Monitor[]> {
    const rows = await this.db.monitor.findMany({ where: { targetId, isActive: true } });
    return rows.map(toEntity);
  }

  async findById(id: string): Promise<Monitor | null> {
    const row = await this.db.monitor.findUnique({ where: { id } });
    return row ? toEntity(row) : null;
  }

  async save(monitor: Monitor): Promise<Monitor> {
    const row = await this.db.monitor.create({
      data: {
        id: monitor.id, userId: monitor.userId, targetId: monitor.targetId,
        isActive: monitor.isActive, name: monitor.name,
      },
    });
    return toEntity(row);
  }

  async update(id: string, data: Partial<{ isActive: boolean; name: string }>): Promise<Monitor> {
    const row = await this.db.monitor.update({ where: { id }, data });
    return toEntity(row);
  }

  async delete(id: string): Promise<void> {
    await this.db.monitor.delete({ where: { id } });
  }
}
```

- [ ] **Step 3: Implement BullMQJobSchedulerAdapter**

```ts
// src/lib/monitoring/infrastructure/adapters/bullmq-job-scheduler.adapter.ts
import { Queue } from 'bullmq';
import { IJobSchedulerPort } from '../../domain/ports/job-scheduler.port';

export class BullMQJobSchedulerAdapter implements IJobSchedulerPort {
  private readonly queue: Queue;

  constructor(connection: { host: string; port: number } | string) {
    this.queue = new Queue('scraping-jobs', {
      connection: typeof connection === 'string'
        ? { host: new URL(connection).hostname, port: parseInt(new URL(connection).port) }
        : connection,
    });
  }

  async upsert(targetId: string, frequencyMinutes: number, payload: object): Promise<void> {
    await this.queue.upsertJobScheduler(
      `target-${targetId}`,
      { every: frequencyMinutes * 60 * 1000 },
      { name: 'scrape', data: payload },
    );
  }

  async remove(targetId: string): Promise<void> {
    await this.queue.removeJobScheduler(`target-${targetId}`);
  }
}
```

- [ ] **Step 4: Create monitoring container**

```ts
// src/lib/monitoring/infrastructure/container.ts
import { prisma } from '@/lib/shared/prisma';
import { redis } from '@/lib/shared/redis';
import { PrismaTargetRepository } from './repositories/prisma-target.repository';
import { PrismaMonitorRepository } from './repositories/prisma-monitor.repository';
import { BullMQJobSchedulerAdapter } from './adapters/bullmq-job-scheduler.adapter';
import { CreateMonitorUseCase } from '../application/use-cases/create-monitor.use-case';
import { ListMonitorsUseCase } from '../application/use-cases/list-monitors.use-case';
import { GetMonitorUseCase } from '../application/use-cases/get-monitor.use-case';
import { UpdateMonitorUseCase } from '../application/use-cases/update-monitor.use-case';
import { DeleteMonitorUseCase } from '../application/use-cases/delete-monitor.use-case';

export function makeMonitoringUseCases() {
  const targetRepo = new PrismaTargetRepository(prisma);
  const monitorRepo = new PrismaMonitorRepository(prisma);
  const scheduler = new BullMQJobSchedulerAdapter(process.env.REDIS_URL!);
  return {
    create: new CreateMonitorUseCase(targetRepo, monitorRepo, scheduler),
    list: new ListMonitorsUseCase(monitorRepo),
    get: new GetMonitorUseCase(monitorRepo),
    update: new UpdateMonitorUseCase(monitorRepo),
    delete: new DeleteMonitorUseCase(monitorRepo, targetRepo, scheduler),
  };
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/monitoring/infrastructure/
git commit -m "feat: add monitoring infrastructure (Prisma repos, BullMQ scheduler, container)"
```

---

## Task 12: Monitoring API Routes

**Files:**
- Create: `src/app/api/monitors/route.ts`
- Create: `src/app/api/monitors/[id]/route.ts`

- [ ] **Step 1: Create monitors collection route**

```ts
// src/app/api/monitors/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/infrastructure/adapters/authjs.config';
import { makeMonitoringUseCases } from '@/lib/monitoring/infrastructure/container';

export async function GET() {
  const session = await auth();
  const { list } = makeMonitoringUseCases();
  const monitors = await list.execute(session!.user!.id!);
  return NextResponse.json(monitors);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json();
  const { url, selectors, frequencyMinutes, name } = body;

  if (!url || !selectors || !frequencyMinutes) {
    return NextResponse.json({ error: 'url, selectors and frequencyMinutes required' }, { status: 400 });
  }

  try {
    const { create } = makeMonitoringUseCases();
    const monitor = await create.execute({
      userId: session!.user!.id!,
      url, selectors, frequencyMinutes, name,
    });
    return NextResponse.json(monitor, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error';
    const status = message === 'Monitor already exists' ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
```

- [ ] **Step 2: Create monitor item route**

```ts
// src/app/api/monitors/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/infrastructure/adapters/authjs.config';
import { makeMonitoringUseCases } from '@/lib/monitoring/infrastructure/container';

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  const { get } = makeMonitoringUseCases();
  try {
    const monitor = await get.execute(params.id, session!.user!.id!);
    return NextResponse.json(monitor);
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  const body = await req.json();
  const { update } = makeMonitoringUseCases();
  try {
    const monitor = await update.execute(params.id, session!.user!.id!, body);
    return NextResponse.json(monitor);
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  const { delete: del } = makeMonitoringUseCases();
  try {
    await del.execute(params.id, session!.user!.id!);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/monitors/
git commit -m "feat: add monitors API route handlers"
```

---

## Task 13: Scraping Domain + Mongoose Schema

**Files:**
- Create: `src/lib/scraping/domain/ports/scraper-strategy.port.ts`
- Create: `src/lib/scraping/domain/ports/scraped-document-repository.port.ts`
- Create: `src/lib/scraping/infrastructure/schemas/scraped-document.schema.ts`
- Create: `src/lib/scraping/infrastructure/repositories/mongoose-scraped-document.repository.ts`

- [ ] **Step 1: Create scraping domain ports**

```ts
// src/lib/scraping/domain/ports/scraper-strategy.port.ts
import { SelectorConfig, ScrapeResult } from '@/types/monitor.types';

export interface ScraperStrategyPort {
  canHandle(url: string): Promise<boolean>;
  scrape(url: string, selectors: SelectorConfig[]): Promise<ScrapeResult>;
}
```

```ts
// src/lib/scraping/domain/ports/scraped-document-repository.port.ts
import { ScrapeResult, SelectorConfig } from '@/types/monitor.types';

export type ScrapedDocument = {
  id?: string;
  targetId: string;
  url: string;
  rawHtml: string;
  extractedData: Record<string, string>;
  scrapeStrategy: string;
  scrapedAt: Date;
};

export interface IScrapedDocumentRepository {
  save(doc: Omit<ScrapedDocument, 'id'>): Promise<ScrapedDocument>;
  findLatestByTargetId(targetId: string): Promise<ScrapedDocument | null>;
  findByTargetId(targetId: string, limit: number, offset: number): Promise<ScrapedDocument[]>;
}
```

- [ ] **Step 2: Create Mongoose schema**

```ts
// src/lib/scraping/infrastructure/schemas/scraped-document.schema.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ScrapedDocumentDoc extends Document {
  targetId: string;
  url: string;
  rawHtml: string;
  extractedData: Record<string, string>;
  scrapeStrategy: string;
  scrapedAt: Date;
}

const ScrapedDocumentSchema = new Schema<ScrapedDocumentDoc>({
  targetId: { type: String, required: true, index: true },
  url: { type: String, required: true },
  rawHtml: { type: String, required: true },
  extractedData: { type: Map, of: String },
  scrapeStrategy: { type: String, required: true },
  scrapedAt: { type: Date, default: Date.now },
});

export const ScrapedDocumentModel = mongoose.models.ScrapedDocument
  ?? mongoose.model<ScrapedDocumentDoc>('ScrapedDocument', ScrapedDocumentSchema);
```

- [ ] **Step 3: Implement MongooseScrapedDocumentRepository**

```ts
// src/lib/scraping/infrastructure/repositories/mongoose-scraped-document.repository.ts
import { connectMongoDB } from '@/lib/shared/mongoose';
import { ScrapedDocumentModel } from '../schemas/scraped-document.schema';
import { IScrapedDocumentRepository, ScrapedDocument } from '../../domain/ports/scraped-document-repository.port';

export class MongooseScrapedDocumentRepository implements IScrapedDocumentRepository {
  async save(doc: Omit<ScrapedDocument, 'id'>): Promise<ScrapedDocument> {
    await connectMongoDB();
    const created = await ScrapedDocumentModel.create(doc);
    return { ...doc, id: created._id.toString() };
  }

  async findLatestByTargetId(targetId: string): Promise<ScrapedDocument | null> {
    await connectMongoDB();
    const doc = await ScrapedDocumentModel
      .findOne({ targetId })
      .sort({ scrapedAt: -1 });
    if (!doc) return null;
    return {
      id: doc._id.toString(), targetId: doc.targetId, url: doc.url,
      rawHtml: doc.rawHtml, extractedData: doc.extractedData,
      scrapeStrategy: doc.scrapeStrategy, scrapedAt: doc.scrapedAt,
    };
  }

  async findByTargetId(targetId: string, limit: number, offset: number): Promise<ScrapedDocument[]> {
    await connectMongoDB();
    const docs = await ScrapedDocumentModel
      .find({ targetId })
      .sort({ scrapedAt: -1 })
      .skip(offset)
      .limit(limit);
    return docs.map(d => ({
      id: d._id.toString(), targetId: d.targetId, url: d.url,
      rawHtml: d.rawHtml, extractedData: d.extractedData,
      scrapeStrategy: d.scrapeStrategy, scrapedAt: d.scrapedAt,
    }));
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/scraping/
git commit -m "feat: add scraping domain ports, Mongoose schema and repository"
```

---

## Task 14: Static Scraper Adapter (axios + cheerio)

**Files:**
- Create: `src/lib/scraping/infrastructure/adapters/static-scraper.adapter.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/scraping/infrastructure/adapters/static-scraper.adapter.test.ts
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
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test -- static-scraper.adapter.test.ts
```

- [ ] **Step 3: Implement**

```ts
// src/lib/scraping/infrastructure/adapters/static-scraper.adapter.ts
import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScraperStrategyPort } from '../../domain/ports/scraper-strategy.port';
import { SelectorConfig, ScrapeResult } from '@/types/monitor.types';

export class StaticScraperAdapter implements ScraperStrategyPort {
  async canHandle(url: string): Promise<boolean> {
    try {
      await axios.head(url, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async scrape(url: string, selectors: SelectorConfig[]): Promise<ScrapeResult> {
    const { data: rawHtml } = await axios.get<string>(url, { timeout: 10000 });
    const $ = cheerio.load(rawHtml);
    const extractedData: Record<string, string> = {};
    for (const { field, css } of selectors) {
      extractedData[field] = $(css).first().text().trim();
    }
    return { rawHtml, extractedData, strategy: 'static' };
  }
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npm test -- static-scraper.adapter.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/scraping/infrastructure/adapters/static-scraper.adapter.ts
git commit -m "feat: add StaticScraperAdapter with axios and cheerio"
```

---

## Task 15: Dynamic Scraper Adapter (Playwright)

**Files:**
- Create: `src/lib/scraping/infrastructure/adapters/dynamic-scraper.adapter.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/scraping/infrastructure/adapters/dynamic-scraper.adapter.test.ts
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
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test -- dynamic-scraper.adapter.test.ts
```

- [ ] **Step 3: Implement**

```ts
// src/lib/scraping/infrastructure/adapters/dynamic-scraper.adapter.ts
import { chromium } from 'playwright';
import { ScraperStrategyPort } from '../../domain/ports/scraper-strategy.port';
import { SelectorConfig, ScrapeResult } from '@/types/monitor.types';

export class DynamicScraperAdapter implements ScraperStrategyPort {
  async canHandle(_url: string): Promise<boolean> {
    return true;
  }

  async scrape(url: string, selectors: SelectorConfig[]): Promise<ScrapeResult> {
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      const rawHtml = await page.content();
      const extractedData: Record<string, string> = {};
      for (const { field, css } of selectors) {
        try {
          extractedData[field] = await page.$eval(css, (el) => el.textContent?.trim() ?? '');
        } catch {
          extractedData[field] = '';
        }
      }
      await context.close();
      return { rawHtml, extractedData, strategy: 'dynamic' };
    } finally {
      await browser.close();
    }
  }
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npm test -- dynamic-scraper.adapter.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/scraping/infrastructure/adapters/dynamic-scraper.adapter.ts
git commit -m "feat: add DynamicScraperAdapter with Playwright"
```

---

## Task 16: ScrapeTargetUseCase

**Files:**
- Create: `src/lib/scraping/application/use-cases/scrape-target.use-case.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/scraping/application/use-cases/scrape-target.use-case.test.ts
import { ScrapeTargetUseCase } from './scrape-target.use-case';
import { ScraperStrategyPort } from '../../domain/ports/scraper-strategy.port';
import { IScrapedDocumentRepository } from '../../domain/ports/scraped-document-repository.port';

describe('ScrapeTargetUseCase', () => {
  let staticAdapter: jest.Mocked<ScraperStrategyPort>;
  let dynamicAdapter: jest.Mocked<ScraperStrategyPort>;
  let docRepo: jest.Mocked<IScrapedDocumentRepository>;

  beforeEach(() => {
    staticAdapter = { canHandle: jest.fn(), scrape: jest.fn() };
    dynamicAdapter = { canHandle: jest.fn(), scrape: jest.fn() };
    docRepo = { save: jest.fn(), findLatestByTargetId: jest.fn(), findByTargetId: jest.fn() };
  });

  it('uses static adapter when it can handle URL', async () => {
    staticAdapter.canHandle.mockResolvedValue(true);
    staticAdapter.scrape.mockResolvedValue({ rawHtml: '<html/>', extractedData: { price: '$100' }, strategy: 'static' });
    docRepo.save.mockImplementation(async (d) => ({ ...d, id: 'doc-1' }));

    const uc = new ScrapeTargetUseCase([staticAdapter, dynamicAdapter], docRepo);
    const result = await uc.execute({ targetId: 't1', url: 'https://x.com', selectors: [{ field: 'price', css: '.p' }] });

    expect(staticAdapter.scrape).toHaveBeenCalled();
    expect(dynamicAdapter.scrape).not.toHaveBeenCalled();
    expect(result.scrapeStrategy).toBe('static');
  });

  it('falls back to dynamic when static cannot handle', async () => {
    staticAdapter.canHandle.mockResolvedValue(false);
    dynamicAdapter.canHandle.mockResolvedValue(true);
    dynamicAdapter.scrape.mockResolvedValue({ rawHtml: '<html/>', extractedData: { price: '$200' }, strategy: 'dynamic' });
    docRepo.save.mockImplementation(async (d) => ({ ...d, id: 'doc-2' }));

    const uc = new ScrapeTargetUseCase([staticAdapter, dynamicAdapter], docRepo);
    const result = await uc.execute({ targetId: 't1', url: 'https://x.com', selectors: [] });

    expect(dynamicAdapter.scrape).toHaveBeenCalled();
    expect(result.scrapeStrategy).toBe('dynamic');
  });

  it('throws if no strategy can handle the URL', async () => {
    staticAdapter.canHandle.mockResolvedValue(false);
    dynamicAdapter.canHandle.mockResolvedValue(false);

    const uc = new ScrapeTargetUseCase([staticAdapter, dynamicAdapter], docRepo);
    await expect(uc.execute({ targetId: 't1', url: 'https://x.com', selectors: [] }))
      .rejects.toThrow('No strategy available');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test -- scrape-target.use-case.test.ts
```

- [ ] **Step 3: Implement**

```ts
// src/lib/scraping/application/use-cases/scrape-target.use-case.ts
import { ScraperStrategyPort } from '../../domain/ports/scraper-strategy.port';
import { IScrapedDocumentRepository, ScrapedDocument } from '../../domain/ports/scraped-document-repository.port';
import { SelectorConfig } from '@/types/monitor.types';

type ScrapeInput = { targetId: string; url: string; selectors: SelectorConfig[] };

export class ScrapeTargetUseCase {
  constructor(
    private readonly strategies: ScraperStrategyPort[],
    private readonly docRepo: IScrapedDocumentRepository,
  ) {}

  async execute(input: ScrapeInput): Promise<ScrapedDocument> {
    let result = null;
    for (const strategy of this.strategies) {
      if (await strategy.canHandle(input.url)) {
        result = await strategy.scrape(input.url, input.selectors);
        break;
      }
    }
    if (!result) throw new Error('No strategy available');

    return this.docRepo.save({
      targetId: input.targetId,
      url: input.url,
      rawHtml: result.rawHtml,
      extractedData: result.extractedData,
      scrapeStrategy: result.strategy,
      scrapedAt: new Date(),
    });
  }
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npm test -- scrape-target.use-case.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/scraping/application/
git commit -m "feat: add ScrapeTargetUseCase with strategy selection"
```

---

## Task 17: Notifications Module

**Files:**
- Create: `src/lib/notifications/domain/ports/notification.port.ts`
- Create: `src/lib/notifications/application/use-cases/notify-change.use-case.ts`
- Create: `src/lib/notifications/infrastructure/adapters/nodemailer.adapter.ts`

- [ ] **Step 1: Write failing test for NotifyChangeUseCase**

```ts
// src/lib/notifications/application/use-cases/notify-change.use-case.test.ts
import { NotifyChangeUseCase } from './notify-change.use-case';
import { INotificationPort } from '../../domain/ports/notification.port';
import { IMonitorRepository } from '@/lib/monitoring/domain/ports/monitor-repository.port';
import { IUserRepository } from '@/lib/auth/domain/ports/user-repository.port';
import { Monitor } from '@/lib/monitoring/domain/entities/monitor.entity';
import { User } from '@/lib/auth/domain/entities/user.entity';
import { DiffEntry } from '@/types/monitor.types';

describe('NotifyChangeUseCase', () => {
  it('sends email to all users monitoring the target', async () => {
    const notifier: jest.Mocked<INotificationPort> = { send: jest.fn().mockResolvedValue(undefined) };
    const monitorRepo: jest.Mocked<IMonitorRepository> = {
      findByTargetId: jest.fn().mockResolvedValue([
        new Monitor('m1', 'u1', 't1'), new Monitor('m2', 'u2', 't1'),
      ]),
      findByUserId: jest.fn(), findByUserAndTarget: jest.fn(), findById: jest.fn(),
      save: jest.fn(), update: jest.fn(), delete: jest.fn(),
    };
    const userRepo: jest.Mocked<IUserRepository> = {
      findById: jest.fn()
        .mockResolvedValueOnce(new User('u1', 'user1@test.com', 'pw', 'USER'))
        .mockResolvedValueOnce(new User('u2', 'user2@test.com', 'pw', 'USER')),
      findByEmail: jest.fn(), save: jest.fn(),
    };

    const uc = new NotifyChangeUseCase(notifier, monitorRepo, userRepo);
    const diff: DiffEntry[] = [{ field: 'price', oldValue: '$100', newValue: '$90' }];
    await uc.execute({ targetId: 't1', targetUrl: 'https://x.com', diff, changeType: 'CONTENT_DIFF' });

    expect(notifier.send).toHaveBeenCalledTimes(2);
    expect(notifier.send).toHaveBeenCalledWith(
      'user1@test.com', expect.any(String), expect.stringContaining('$90')
    );
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test -- notify-change.use-case.test.ts
```

- [ ] **Step 3: Implement**

```ts
// src/lib/notifications/domain/ports/notification.port.ts
export interface INotificationPort {
  send(to: string, subject: string, body: string): Promise<void>;
}
```

```ts
// src/lib/notifications/application/use-cases/notify-change.use-case.ts
import { INotificationPort } from '../../domain/ports/notification.port';
import { IMonitorRepository } from '@/lib/monitoring/domain/ports/monitor-repository.port';
import { IUserRepository } from '@/lib/auth/domain/ports/user-repository.port';
import { DiffEntry, ChangeType } from '@/types/monitor.types';

type NotifyInput = {
  targetId: string;
  targetUrl: string;
  diff: DiffEntry[];
  changeType: ChangeType;
};

export class NotifyChangeUseCase {
  constructor(
    private readonly notifier: INotificationPort,
    private readonly monitorRepo: IMonitorRepository,
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(input: NotifyInput): Promise<void> {
    const monitors = await this.monitorRepo.findByTargetId(input.targetId);
    const users = await Promise.all(monitors.map(m => this.userRepo.findById(m.userId)));

    const subject = input.changeType === 'SELECTOR_MISSING'
      ? `[Scrapper] Selector missing on ${input.targetUrl}`
      : `[Scrapper] Change detected on ${input.targetUrl}`;

    const body = this.buildEmailBody(input);

    await Promise.allSettled(
      users.filter(Boolean).map(u => this.notifier.send(u!.email, subject, body))
    );
  }

  private buildEmailBody(input: NotifyInput): string {
    const rows = input.diff.map(d =>
      `<tr><td>${d.field}</td><td>${d.oldValue}</td><td>${d.newValue}</td></tr>`
    ).join('');
    return `
      <h2>Changes on <a href="${input.targetUrl}">${input.targetUrl}</a></h2>
      <table border="1">
        <tr><th>Field</th><th>Old Value</th><th>New Value</th></tr>
        ${rows}
      </table>
    `;
  }
}
```

- [ ] **Step 4: Implement NodemailerAdapter**

```ts
// src/lib/notifications/infrastructure/adapters/nodemailer.adapter.ts
import nodemailer from 'nodemailer';
import { INotificationPort } from '../../domain/ports/notification.port';

export class NodemailerAdapter implements INotificationPort {
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '587'),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  async send(to: string, subject: string, body: string): Promise<void> {
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to, subject, html: body,
    });
  }
}
```

- [ ] **Step 5: Run — expect PASS**

```bash
npm test -- notify-change.use-case.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/notifications/
git commit -m "feat: add notifications module (NotifyChangeUseCase, NodemailerAdapter)"
```

---

## Task 18: BullMQ Worker Process

**Files:**
- Create: `worker/index.ts`

- [ ] **Step 1: Install Playwright browsers**

```bash
npx playwright install chromium
```

- [ ] **Step 2: Create worker**

```ts
// worker/index.ts
import { Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import mongoose from 'mongoose';
import { StaticScraperAdapter } from '../src/lib/scraping/infrastructure/adapters/static-scraper.adapter';
import { DynamicScraperAdapter } from '../src/lib/scraping/infrastructure/adapters/dynamic-scraper.adapter';
import { MongooseScrapedDocumentRepository } from '../src/lib/scraping/infrastructure/repositories/mongoose-scraped-document.repository';
import { ScrapeTargetUseCase } from '../src/lib/scraping/application/use-cases/scrape-target.use-case';
import { PrismaMonitorRepository } from '../src/lib/monitoring/infrastructure/repositories/prisma-monitor.repository';
import { PrismaUserRepository } from '../src/lib/auth/infrastructure/repositories/prisma-user.repository';
import { NodemailerAdapter } from '../src/lib/notifications/infrastructure/adapters/nodemailer.adapter';
import { NotifyChangeUseCase } from '../src/lib/notifications/application/use-cases/notify-change.use-case';
import { DiffEntry } from '../src/types/monitor.types';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function bootstrap() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('Worker connected to MongoDB');

  const docRepo = new MongooseScrapedDocumentRepository();
  const scrapeUseCase = new ScrapeTargetUseCase(
    [new StaticScraperAdapter(), new DynamicScraperAdapter()],
    docRepo,
  );

  const monitorRepo = new PrismaMonitorRepository(prisma);
  const userRepo = new PrismaUserRepository(prisma);
  const notifier = new NodemailerAdapter();
  const notifyUseCase = new NotifyChangeUseCase(notifier, monitorRepo, userRepo);

  const worker = new Worker(
    'scraping-jobs',
    async (job) => {
      const { targetId, url, selectors } = job.data;
      console.log(`[Worker] Scraping target ${targetId}`);

      const current = await scrapeUseCase.execute({ targetId, url, selectors });
      const previous = await docRepo.findLatestByTargetId(targetId);

      // detect diff
      const diff: DiffEntry[] = [];
      const missingSelectorFields: string[] = [];

      for (const { field } of selectors) {
        const currentVal = current.extractedData[field] ?? '';
        const previousVal = previous?.extractedData[field] ?? null;

        if (currentVal === '') {
          missingSelectorFields.push(field);
        } else if (previousVal !== null && currentVal !== previousVal) {
          diff.push({ field, oldValue: previousVal, newValue: currentVal });
        }
      }

      if (missingSelectorFields.length > 0) {
        await prisma.change.create({
          data: {
            targetId, type: 'SELECTOR_MISSING',
            diff: missingSelectorFields.map(field => ({ field, oldValue: '', newValue: 'MISSING' })),
          },
        });
        await notifyUseCase.execute({
          targetId, targetUrl: url,
          diff: missingSelectorFields.map(f => ({ field: f, oldValue: '', newValue: 'MISSING' })),
          changeType: 'SELECTOR_MISSING',
        });
      }

      if (diff.length > 0) {
        await prisma.change.create({ data: { targetId, type: 'CONTENT_DIFF', diff } });
        await notifyUseCase.execute({ targetId, targetUrl: url, diff, changeType: 'CONTENT_DIFF' });
      }

      await prisma.target.update({ where: { id: targetId }, data: { lastRunAt: new Date() } });
      console.log(`[Worker] Done — ${diff.length} changes, ${missingSelectorFields.length} missing selectors`);
    },
    {
      connection: { host: new URL(process.env.REDIS_URL!).hostname, port: parseInt(new URL(process.env.REDIS_URL!).port) },
      concurrency: 5,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    },
  );

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
  });

  console.log('Worker listening on scraping-jobs queue');
}

bootstrap().catch(console.error);
```

- [ ] **Step 3: Commit**

```bash
git add worker/
git commit -m "feat: add BullMQ worker process for scraping jobs"
```

---

## Task 19: History API Route + Basic Dashboard UI

**Files:**
- Create: `src/app/api/targets/[id]/history/route.ts`
- Create: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Create history route**

```ts
// src/app/api/targets/[id]/history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/infrastructure/adapters/authjs.config';
import { MongooseScrapedDocumentRepository } from '@/lib/scraping/infrastructure/repositories/mongoose-scraped-document.repository';

type Params = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Params) {
  await auth();
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') ?? '20');
  const offset = parseInt(url.searchParams.get('offset') ?? '0');

  const repo = new MongooseScrapedDocumentRepository();
  const docs = await repo.findByTargetId(params.id, limit, offset);
  return NextResponse.json(docs);
}
```

- [ ] **Step 2: Create minimal dashboard page**

```tsx
// src/app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';

type Monitor = {
  id: string;
  name: string | null;
  targetId: string;
  isActive: boolean;
  createdAt: string;
};

export default function DashboardPage() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/monitors')
      .then(r => r.json())
      .then(data => { setMonitors(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Monitors</h1>
      {loading && <p>Loading...</p>}
      {!loading && monitors.length === 0 && <p className="text-gray-500">No monitors yet.</p>}
      <ul className="space-y-3">
        {monitors.map(m => (
          <li key={m.id} className="border rounded p-4 flex justify-between items-center">
            <div>
              <p className="font-medium">{m.name ?? m.id}</p>
              <p className="text-sm text-gray-500">Target: {m.targetId}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded ${m.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
              {m.isActive ? 'Active' : 'Paused'}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/
git commit -m "feat: add history route and minimal dashboard UI"
```

---

## Task 20: Self-Review + Run Everything

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 2: Start infrastructure**

```bash
npm run db:up
```

- [ ] **Step 3: Run migrations**

```bash
npm run db:migrate
```

- [ ] **Step 4: Start dev servers (Next.js + worker)**

```bash
npm run dev
```

Expected: Next.js on `http://localhost:3000`, worker process connected to Redis.

- [ ] **Step 5: Smoke test — register user**

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
```

Expected: `201` with `{ id, email, role }`.

- [ ] **Step 6: Smoke test — create monitor (after login in browser)**

```bash
curl -X POST http://localhost:3000/api/monitors \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{
    "url": "https://quotes.toscrape.com",
    "selectors": [{"field": "first_quote", "css": ".quote .text"}],
    "frequencyMinutes": 1
  }'
```

Expected: `201` with monitor object. BullMQ job created. Worker scrapes within 1 minute.

- [ ] **Step 7: Final commit**

```bash
git add .
git commit -m "feat: complete NestJS scraper MVP (Next.js full-stack + BullMQ worker)"
```
