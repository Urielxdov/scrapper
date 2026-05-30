import { User } from "../../domain/entities/user.entity";
import { IUserRepository } from "../../domain/ports/user-repository.port";
import { IHashPort } from "../../domain/ports/IHashPort.port";
import { RegisterInput } from "../dtos/inputs";

export class RegisterUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly hashPort: IHashPort
  ) { }

  async execute(input: RegisterInput): Promise<User> {
    const existing = await this.userRepo.findByEmail(input.email)
    if (existing) throw new Error('Este correo ya esta en uso')
    const hashed = await this.hashPort.hash(input.password)
    const user = new User(crypto.randomUUID(), input.email, hashed, 'USER')
    return this.userRepo.save(user)
  }
}