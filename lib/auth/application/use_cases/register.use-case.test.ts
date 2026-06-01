// src/lib/auth/application/use-cases/register.use-case.test.ts
import { RegisterUseCase } from './register.use-case';
import { IUserRepository } from '../../domain/ports/user-repository.port';
import { IHashPort } from '../../domain/ports/hash.port';
import { User } from '../../domain/entities/user.entity';

describe('RegisterUseCase', () => {
  let useCase: RegisterUseCase;
  let userRepo: jest.Mocked<IUserRepository>;
  let hashPort: jest.Mocked<IHashPort>;

  beforeEach(() => {
    userRepo = { findByEmail: jest.fn(), findById: jest.fn(), save: jest.fn() };
    hashPort = { hash: jest.fn(), compare: jest.fn() };
    useCase = new RegisterUseCase(userRepo, hashPort);
  });

  it('registers a new user and returns it', async () => {
    userRepo.findByEmail.mockResolvedValue(null);
    hashPort.hash.mockResolvedValue('hashed-pw');
    userRepo.save.mockImplementation(async (u) => u);

    const result = await useCase.execute({ email: 'a@b.com', password: '123456' });

    expect(hashPort.hash).toHaveBeenCalledWith('123456');
    expect(result.email).toBe('a@b.com');
  });

  it('throws ConflictError if email already taken', async () => {
    const { randomUUID } = await import('crypto');
    userRepo.findByEmail.mockResolvedValue(
      new User(randomUUID(), 'a@b.com', 'password123', 'USER')
    );
    await expect(useCase.execute({ email: 'a@b.com', password: '123456' }))
      .rejects.toThrow('Este correo ya esta en uso');
  });
});