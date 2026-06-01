export interface IJobSchedulerPort {
  upsert(targetId: string, frequencyMinutes: number, payload: object): Promise<void>;
  remove(targetId: string): Promise<void>;
}
