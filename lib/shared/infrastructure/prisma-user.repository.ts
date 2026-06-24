import { PrismaClient } from '@/lib/generated/prisma';
import { IUser, IUserRepository } from '../types/user.types';

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<IUser | null> {
    const row = await this.db.user.findUnique({ where: { id }, select: { id: true, email: true } });
    return row ?? null;
  }
}
