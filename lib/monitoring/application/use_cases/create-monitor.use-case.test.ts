import { CreateMonitorUseCase } from './create-monitor.use-case';
import { ITargetRepository } from '../../domain/ports/target-repository.port';
import { IMonitorRepository } from '../../domain/ports/monitor-repository.port';
import { IJobSchedulerPort } from '../../domain/ports/job-scheduler.port';
import { Target } from '../../domain/entities/target.entity';
import { Monitor } from '../../domain/entities/monitor.entity';

describe('CreateMonitorUseCase', () => {
  let useCase: CreateMonitorUseCase;
  let targetRepo: jest.Mocked<ITargetRepository>;
  let monitorRepo: jest.Mocked<IMonitorRepository>;
  let scheduler: jest.Mocked<IJobSchedulerPort>;

  beforeEach(() => {
    targetRepo = { findByUrl: jest.fn(), findById: jest.fn(), save: jest.fn(), update: jest.fn() };
    monitorRepo = {
      findByUserAndTarget: jest.fn(), findByUserId: jest.fn(), findByTargetId: jest.fn(),
      findById: jest.fn(), save: jest.fn(), update: jest.fn(), delete: jest.fn(),
    };
    scheduler = { upsert: jest.fn(), remove: jest.fn() };
    useCase = new CreateMonitorUseCase(targetRepo, monitorRepo, scheduler);
  });

  it('creates target and monitor when URL is new', async () => {
    targetRepo.findByUrl.mockResolvedValue(null);
    targetRepo.save.mockImplementation(async (t) => t);
    monitorRepo.findByUserAndTarget.mockResolvedValue(null);
    monitorRepo.save.mockImplementation(async (m) => m);

    const result = await useCase.execute({
      userId: 'user-1',
      url: 'https://example.com',
      selectors: [{ field: 'price', css: '.price' }],
      frequencyMinutes: 60,
    });

    expect(targetRepo.save).toHaveBeenCalled();
    expect(monitorRepo.save).toHaveBeenCalled();
    expect(scheduler.upsert).toHaveBeenCalledWith(expect.any(String), 60, expect.any(Object));
    expect(result.userId).toBe('user-1');
  });

  it('reuses existing target and merges selectors', async () => {
    const existing = new Target('t-1', 'https://example.com', [{ field: 'price', css: '.old' }], 120);
    targetRepo.findByUrl.mockResolvedValue(existing);
    targetRepo.update.mockImplementation(async (id, data) =>
      new Target(id, 'https://example.com', data.selectors!, data.frequency!, null)
    );
    monitorRepo.findByUserAndTarget.mockResolvedValue(null);
    monitorRepo.save.mockImplementation(async (m) => m);

    await useCase.execute({
      userId: 'user-1',
      url: 'https://example.com',
      selectors: [{ field: 'price', css: '.new' }],
      frequencyMinutes: 30,
    });

    expect(targetRepo.update).toHaveBeenCalledWith('t-1', expect.objectContaining({ frequency: 30 }));
  });

  it('throws if monitor already exists for user+target', async () => {
    const existing = new Target('t-1', 'https://example.com', [], 60);
    targetRepo.findByUrl.mockResolvedValue(existing);
    targetRepo.update.mockResolvedValue(existing);
    monitorRepo.findByUserAndTarget.mockResolvedValue(new Monitor('m-1', 'user-1', 't-1'));

    await expect(useCase.execute({
      userId: 'user-1',
      url: 'https://example.com',
      selectors: [],
      frequencyMinutes: 60,
    })).rejects.toThrow('Monitor already exists');
  });
});
