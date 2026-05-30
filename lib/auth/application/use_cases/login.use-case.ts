import { User } from "../../domain/entities/user.entity";
import { IUserRepository } from "../../domain/ports/user-repository.port";
import { IHashPort } from "../../domain/ports/IHashPort.port";
import { LoginInput } from "../dtos/inputs";

export class LoginUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly hashPort: IHashPort
  ) { }

  async execute(input: LoginInput): Promise<User | null> {
    const user = await this.userRepo.findByEmail(input.email)
    if (!user) return null
    const valid = await this.hashPort.compare(input.password, user.password)
    return valid ? user : null
  }
}