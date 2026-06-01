export interface INotificationPort {
  send(to: string, subject: string, body: string): Promise<void>;
}
