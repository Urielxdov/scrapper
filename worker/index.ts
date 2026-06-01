import { Worker } from 'bullmq';
import { PrismaClient } from '../lib/generated/prisma';
import mongoose from 'mongoose';
import { StaticScraperAdapter } from '../lib/scraping/infrastructure/adapters/static-scraper.adapter';
import { DynamicScraperAdapter } from '../lib/scraping/infrastructure/adapters/dynamic-scraper.adapter';
import { MongooseScrapedDocumentRepository } from '../lib/scraping/infrastructure/repositories/mongoose-scraped-document.repository';
import { ScrapeTargetUseCase } from '../lib/scraping/application/use_cases/scrape-target.use-case';
import { PrismaMonitorRepository } from '../lib/monitoring/infrastructure/repositories/prisma-monitor.repository';
import { PrismaUserRepository } from '../lib/auth/infrastructure/repositories/prisma-user.repository';
import { NodemailerAdapter } from '../lib/notifications/infrastructure/adapters/nodemailer.adapter';
import { NotifyChangeUseCase } from '../lib/notifications/application/use_cases/notify-change.use-case';
import { DiffEntry } from '../lib/shared/types/monitor.types';
import { workerLogger, notifierLogger, scraperLogger } from '../lib/shared/logger';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function bootstrap() {
  await mongoose.connect(process.env.MONGODB_URI!);
  workerLogger.info('connected to MongoDB');

  const docRepo = new MongooseScrapedDocumentRepository();
  const scrapeUseCase = new ScrapeTargetUseCase(
    [new StaticScraperAdapter(), new DynamicScraperAdapter()],
    docRepo,
  );

  const monitorRepo = new PrismaMonitorRepository(prisma);
  const userRepo = new PrismaUserRepository(prisma);
  const notifier = new NodemailerAdapter();
  const notifyUseCase = new NotifyChangeUseCase(notifier, monitorRepo, userRepo);

  const redisUrl = new URL(process.env.REDIS_URL!);

  const worker = new Worker(
    'scraping-jobs',
    async (job) => {
      const { targetId, url, selectors } = job.data;
      const jobLog = workerLogger.child({ jobId: job.id, targetId, url });

      jobLog.info('scrape started');
      const start = Date.now();

      const current = await scrapeUseCase.execute({ targetId, url, selectors });

      scraperLogger.info(
        { targetId, strategy: current.scrapeStrategy, duration_ms: Date.now() - start },
        'scrape complete'
      );

      const previous = await docRepo.findLatestByTargetId(targetId);

      const diff: DiffEntry[] = [];
      const missingSelectorFields: string[] = [];

      for (const { field, regex } of selectors) {
        let currentVal = current.extractedData[field] ?? '';

        if (currentVal === '' && regex) {
          try {
            const match = current.rawHTML.match(new RegExp(regex, 'i'));
            if (match) {
              currentVal = match[0].trim();
              jobLog.debug({ field, matchedVia: 'regex' }, 'css selector empty, regex fallback matched');
            }
          } catch {
            jobLog.warn({ field, regex }, 'invalid regex — skipping fallback');
          }
        }

        const previousVal = previous?.extractedData[field] ?? null;

        if (currentVal === '') {
          missingSelectorFields.push(field);
        } else if (previousVal !== null && currentVal !== previousVal) {
          diff.push({ field, oldValue: previousVal, newValue: currentVal });
        }
      }

      if (missingSelectorFields.length > 0) {
        jobLog.warn({ fields: missingSelectorFields }, 'selectors returned no content');
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
        notifierLogger.info({ targetId, fields: missingSelectorFields }, 'selector_missing notification sent');
      }

      if (diff.length > 0) {
        jobLog.info({ changes: diff }, 'content diff detected');
        await prisma.change.create({ data: { targetId, type: 'CONTENT_DIFF', diff } });
        await notifyUseCase.execute({ targetId, targetUrl: url, diff, changeType: 'CONTENT_DIFF' });
        notifierLogger.info({ targetId, changeCount: diff.length }, 'content_diff notification sent');
      }

      await prisma.target.update({ where: { id: targetId }, data: { lastRunAt: new Date() } });

      jobLog.info(
        { changes: diff.length, missing: missingSelectorFields.length, total_ms: Date.now() - start },
        'job complete'
      );
    },
    {
      connection: { host: redisUrl.hostname, port: parseInt(redisUrl.port || '6379') },
      concurrency: 5,
    },
  );

  worker.on('failed', (job, err) => {
    workerLogger.error({ jobId: job?.id, targetId: job?.data?.targetId, err: err.message }, 'job failed');
  });

  worker.on('error', (err) => {
    workerLogger.error({ err: err.message }, 'worker error');
  });

  workerLogger.info('listening on scraping-jobs queue');
}

bootstrap().catch(err => {
  workerLogger.error({ err: err.message }, 'bootstrap failed');
  process.exit(1);
});
