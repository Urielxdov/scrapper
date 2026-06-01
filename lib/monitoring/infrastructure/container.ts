import { prisma } from '@/lib/shared/prisma';
import { PrismaTargetRepository } from './repositories/prisma-target.repository';
import { PrismaMonitorRepository } from './repositories/prisma-monitor.repository';
import { BullMQJobSchedulerAdapter } from './adapters/bullmq-job-scheduler.adapter';
import { CreateMonitorUseCase } from '../application/use_cases/create-monitor.use-case';
import { ListMonitorsUseCase } from '../application/use_cases/list-monitors.use-case';
import { GetMonitorUseCase } from '../application/use_cases/get-monitor.use-case';
import { UpdateMonitorUseCase } from '../application/use_cases/update-monitor.use-case';
import { DeleteMonitorUseCase } from '../application/use_cases/delete-monitor.use-case';

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
