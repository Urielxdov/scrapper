import { NotifyChangeUseCase } from './notify-change.use-case';
import { INotificationPort } from '../../domain/ports/notification.port';
import { IMonitorRepository } from '@/lib/monitoring/domain/ports/monitor-repository.port';
import { IUserRepository } from '@/lib/shared/types/user.types';
import { Monitor } from '@/lib/monitoring/domain/entities/monitor.entity';
import { DiffEntry } from '@/lib/shared/types/monitor.types';
import { randomUUID } from 'crypto';

describe('NotifyChangeUseCase', () => {
  it('sends email to all users monitoring the target', async () => {
    const notifier: jest.Mocked<INotificationPort> = { send: jest.fn().mockResolvedValue(undefined) };
    const monitorRepo: jest.Mocked<IMonitorRepository> = {
      findByTargetId: jest.fn().mockResolvedValue([
        new Monitor('m1', 'u1', 't1'), new Monitor('m2', 'u2', 't1'),
      ]),
      findByUserId: jest.fn(), findByUserAndTarget: jest.fn(), findById: jest.fn(),
      save: jest.fn(), update: jest.fn(), delete: jest.fn(),
    };
    const userRepo: jest.Mocked<IUserRepository> = {
      findById: jest.fn()
        .mockResolvedValueOnce({ id: randomUUID(), email: 'user1@test.com' })
        .mockResolvedValueOnce({ id: randomUUID(), email: 'user2@test.com' }),
    };

    const uc = new NotifyChangeUseCase(notifier, monitorRepo, userRepo);
    const diff: DiffEntry[] = [{ field: 'price', oldValue: '$100', newValue: '$90' }];
    await uc.execute({ targetId: 't1', targetUrl: 'https://x.com', diff, changeType: 'CONTENT_DIFF' });

    expect(notifier.send).toHaveBeenCalledTimes(2);
    expect(notifier.send).toHaveBeenCalledWith(
      'user1@test.com', expect.any(String), expect.stringContaining('$90')
    );
  });
});
