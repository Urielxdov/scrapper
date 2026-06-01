import { LoginUseCase } from './login.use-case';
import { IUserRepository } from '../../domain/ports/user-repository.port';
import { IHashPort } from '../../domain/ports/IHashPort.port';
import { User } from '../../domain/entities/user.entity';
import { randomUUID } from 'crypto';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let userRepo: jest.Mocked<IUserRepository>;
  let hashPort: jest.Mocked<IHashPort>;

  beforeEach(() => {
    userRepo = { findByEmail: jest.fn(), findById: jest.fn(), save: jest.fn() };
    hashPort = { hash: jest.fn(), compare: jest.fn() };
    useCase = new LoginUseCase(userRepo, hashPort);
  });

  it('returns user when credentials are valid', async () => {
    userRepo.findByEmail.mockResolvedValue(new User(randomUUID(), 'a@b.com', 'hashed', 'USER'));
    hashPort.compare.mockResolvedValue(true);

    const result = await useCase.execute({ email: 'a@b.com', password: '123456' });
    expect(result).not.toBeNull();
  });

  it('returns null when password is wrong', async () => {
    userRepo.findByEmail.mockResolvedValue(new User(randomUUID(), 'a@b.com', 'hashed', 'USER'));
    hashPort.compare.mockResolvedValue(false);

    const result = await useCase.execute({ email: 'a@b.com', password: 'wrong' });
    expect(result).toBeNull();
  });

  it('returns null when user not found', async () => {
    userRepo.findByEmail.mockResolvedValue(null);
    const result = await useCase.execute({ email: 'x@y.com', password: '123' });
    expect(result).toBeNull();
  });
});
