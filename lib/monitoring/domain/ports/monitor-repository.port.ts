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
