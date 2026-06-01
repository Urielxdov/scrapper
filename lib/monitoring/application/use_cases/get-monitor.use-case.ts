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
