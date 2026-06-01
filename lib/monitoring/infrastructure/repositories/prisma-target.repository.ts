import { PrismaClient } from '@/lib/generated/prisma';
import { Target } from '../../domain/entities/target.entity';
import { ITargetRepository } from '../../domain/ports/target-repository.port';
import { SelectorConfig } from '@/lib/shared/types/monitor.types';

function toEntity(row: { id: string; url: string; selectors: unknown; frequency: number; lastRunAt: Date | null; createdAt: Date }): Target {
  return new Target(
    row.id, row.url, row.selectors as SelectorConfig[],
    row.frequency, row.lastRunAt, row.createdAt,
  );
}

export class PrismaTargetRepository implements ITargetRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByUrl(url: string): Promise<Target | null> {
    const row = await this.db.target.findUnique({ where: { url } });
    return row ? toEntity(row) : null;
  }

  async findById(id: string): Promise<Target | null> {
    const row = await this.db.target.findUnique({ where: { id } });
    return row ? toEntity(row) : null;
  }

  async save(target: Target): Promise<Target> {
    const row = await this.db.target.create({
      data: {
        id: target.id, url: target.url,
        selectors: target.selectors, frequency: target.frequency,
      },
    });
    return toEntity(row);
  }

  async update(id: string, data: Partial<{ selectors: SelectorConfig[]; frequency: number; lastRunAt: Date }>): Promise<Target> {
    const row = await this.db.target.update({ where: { id }, data });
    return toEntity(row);
  }
}
