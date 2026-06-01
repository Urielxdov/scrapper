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

  const redisUrl = new URL(process.env.REDIS_URL!);

  const worker = new Worker(
    'scraping-jobs',
    async (job) => {
      const { targetId, url, selectors } = job.data;
      console.log(`[Worker] Scraping target ${targetId}`);

      const current = await scrapeUseCase.execute({ targetId, url, selectors });
      const previous = await docRepo.findLatestByTargetId(targetId);

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
      connection: {
        host: redisUrl.hostname,
        port: parseInt(redisUrl.port || '6379'),
      },
      concurrency: 5,
    },
  );

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
  });

  console.log('Worker listening on scraping-jobs queue');
}

bootstrap().catch(console.error);
