import { DeleteMonitorUseCase } from './delete-monitor.use-case';
import { IMonitorRepository } from '../../domain/ports/monitor-repository.port';
import { ITargetRepository } from '../../domain/ports/target-repository.port';
import { IJobSchedulerPort } from '../../domain/ports/job-scheduler.port';
import { Monitor } from '../../domain/entities/monitor.entity';

describe('DeleteMonitorUseCase', () => {
  let monitorRepo: jest.Mocked<IMonitorRepository>;
  let targetRepo: jest.Mocked<ITargetRepository>;
  let scheduler: jest.Mocked<IJobSchedulerPort>;

  beforeEach(() => {
    monitorRepo = {
      findById: jest.fn(), findByUserId: jest.fn(), findByTargetId: jest.fn(),
      findByUserAndTarget: jest.fn(), save: jest.fn(), update: jest.fn(), delete: jest.fn(),
    };
    targetRepo = { findByUrl: jest.fn(), findById: jest.fn(), save: jest.fn(), update: jest.fn() };
    scheduler = { upsert: jest.fn(), remove: jest.fn() };
  });

  it('deletes monitor and removes job if target has no more monitors', async () => {
    monitorRepo.findById.mockResolvedValue(new Monitor('m1', 'u1', 't1'));
    monitorRepo.findByTargetId.mockResolvedValue([]);
    const uc = new DeleteMonitorUseCase(monitorRepo, targetRepo, scheduler);

    await uc.execute('m1', 'u1');

    expect(monitorRepo.delete).toHaveBeenCalledWith('m1');
    expect(scheduler.remove).toHaveBeenCalledWith('t1');
  });

  it('keeps job if other monitors still watch the target', async () => {
    monitorRepo.findById.mockResolvedValue(new Monitor('m1', 'u1', 't1'));
    monitorRepo.findByTargetId.mockResolvedValue([new Monitor('m2', 'u2', 't1')]);
    const uc = new DeleteMonitorUseCase(monitorRepo, targetRepo, scheduler);

    await uc.execute('m1', 'u1');

    expect(scheduler.remove).not.toHaveBeenCalled();
  });

  it('throws if monitor not found or wrong user', async () => {
    monitorRepo.findById.mockResolvedValue(new Monitor('m1', 'other-user', 't1'));
    const uc = new DeleteMonitorUseCase(monitorRepo, targetRepo, scheduler);
    await expect(uc.execute('m1', 'u1')).rejects.toThrow('Not found');
  });
});
