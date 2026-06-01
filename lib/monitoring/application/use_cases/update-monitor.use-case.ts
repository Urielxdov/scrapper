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
