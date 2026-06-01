import { Target } from '../../domain/entities/target.entity';
import { Monitor } from '../../domain/entities/monitor.entity';
import { ITargetRepository } from '../../domain/ports/target-repository.port';
import { IMonitorRepository } from '../../domain/ports/monitor-repository.port';
import { IJobSchedulerPort } from '../../domain/ports/job-scheduler.port';
import { SelectorConfig } from '@/lib/shared/types/monitor.types';

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
