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
