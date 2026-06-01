import { PrismaClient } from '@/lib/generated/prisma';
import { User } from '../../domain/entities/user.entity';
import { IUserRepository } from '../../domain/ports/user-repository.port';
import { Role } from '@/lib/shared/types/monitor.types';

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.db.user.findUnique({ where: { email } });
    return row ? new User(row.id, row.email, row.password, row.role as Role, row.createdAt) : null;
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.db.user.findUnique({ where: { id } });
    return row ? new User(row.id, row.email, row.password, row.role as Role, row.createdAt) : null;
  }

  async save(user: User): Promise<User> {
    const row = await this.db.user.upsert({
      where: { id: user.id },
      update: { email: user.email, password: user.password, role: user.role },
      create: { id: user.id, email: user.email, password: user.password, role: user.role },
    });
    return new User(row.id, row.email, row.password, row.role as Role, row.createdAt);
  }
}
