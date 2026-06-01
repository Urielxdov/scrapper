import nodemailer from 'nodemailer';
import { INotificationPort } from '../../domain/ports/notification.port';

export class NodemailerAdapter implements INotificationPort {
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '587'),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  async send(to: string, subject: string, body: string): Promise<void> {
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to, subject, html: body,
    });
  }
}
