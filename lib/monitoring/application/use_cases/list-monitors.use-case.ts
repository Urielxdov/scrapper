import { Monitor } from '../../domain/entities/monitor.entity';
import { IMonitorRepository } from '../../domain/ports/monitor-repository.port';

export class ListMonitorsUseCase {
  constructor(private readonly monitorRepo: IMonitorRepository) {}
  async execute(userId: string): Promise<Monitor[]> {
    return this.monitorRepo.findByUserId(userId);
  }
}
