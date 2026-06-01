import { PrismaClient } from '@/lib/generated/prisma';
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
