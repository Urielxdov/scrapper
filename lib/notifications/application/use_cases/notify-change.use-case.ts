import { INotificationPort } from '../../domain/ports/notification.port';
import { IMonitorRepository } from '@/lib/monitoring/domain/ports/monitor-repository.port';
import { IUserRepository } from '@/lib/shared/types/user.types';
import { DiffEntry, ChangeType } from '@/lib/shared/types/monitor.types';

type NotifyInput = {
  targetId: string;
  targetUrl: string;
  diff: DiffEntry[];
  changeType: ChangeType;
};

export class NotifyChangeUseCase {
  constructor(
    private readonly notifier: INotificationPort,
    private readonly monitorRepo: IMonitorRepository,
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(input: NotifyInput): Promise<void> {
    const monitors = await this.monitorRepo.findByTargetId(input.targetId);
    const users = await Promise.all(monitors.map(m => this.userRepo.findById(m.userId)));

    const subject = input.changeType === 'SELECTOR_MISSING'
      ? `[Scrapper] Selector missing on ${input.targetUrl}`
      : `[Scrapper] Change detected on ${input.targetUrl}`;

    const body = this.buildEmailBody(input);

    await Promise.allSettled(
      users.filter(Boolean).map(u => this.notifier.send(u!.email, subject, body))
    );
  }

  private buildEmailBody(input: NotifyInput): string {
    const rows = input.diff.map(d =>
      `<tr><td>${d.field}</td><td>${d.oldValue}</td><td>${d.newValue}</td></tr>`
    ).join('');
    return `
      <h2>Changes on <a href="${input.targetUrl}">${input.targetUrl}</a></h2>
      <table border="1">
        <tr><th>Field</th><th>Old Value</th><th>New Value</th></tr>
        ${rows}
      </table>
    `;
  }
}
