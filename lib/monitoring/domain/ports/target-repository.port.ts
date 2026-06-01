import { Target } from '../entities/target.entity';
import { SelectorConfig } from '@/lib/shared/types/monitor.types';

export interface ITargetRepository {
  findByUrl(url: string): Promise<Target | null>;
  findById(id: string): Promise<Target | null>;
  save(target: Target): Promise<Target>;
  update(id: string, data: Partial<{ selectors: SelectorConfig[]; frequency: number; lastRunAt: Date }>): Promise<Target>;
}
