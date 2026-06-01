import { ListMonitorsUseCase } from './list-monitors.use-case';
import { IMonitorRepository } from '../../domain/ports/monitor-repository.port';
import { Monitor } from '../../domain/entities/monitor.entity';

describe('ListMonitorsUseCase', () => {
  it('returns monitors for user', async () => {
    const repo: jest.Mocked<IMonitorRepository> = {
      findByUserId: jest.fn().mockResolvedValue([new Monitor('m1', 'u1', 't1')]),
      findByUserAndTarget: jest.fn(), findByTargetId: jest.fn(), findById: jest.fn(),
      save: jest.fn(), update: jest.fn(), delete: jest.fn(),
    };
    const uc = new ListMonitorsUseCase(repo);
    const result = await uc.execute('u1');
    expect(result).toHaveLength(1);
    expect(repo.findByUserId).toHaveBeenCalledWith('u1');
  });
});
