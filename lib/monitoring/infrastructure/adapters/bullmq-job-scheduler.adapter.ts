import { Queue } from 'bullmq';
import { IJobSchedulerPort } from '../../domain/ports/job-scheduler.port';

export class BullMQJobSchedulerAdapter implements IJobSchedulerPort {
  private readonly queue: Queue;

  constructor(redisUrl: string) {
    const url = new URL(redisUrl);
    this.queue = new Queue('scraping-jobs', {
      connection: { host: url.hostname, port: parseInt(url.port || '6379') },
    });
  }

  async upsert(targetId: string, frequencyMinutes: number, payload: object): Promise<void> {
    await this.queue.upsertJobScheduler(
      `target-${targetId}`,
      { every: frequencyMinutes * 60 * 1000 },
      { name: 'scrape', data: payload },
    );
  }

  async remove(targetId: string): Promise<void> {
    await this.queue.removeJobScheduler(`target-${targetId}`);
  }
}
