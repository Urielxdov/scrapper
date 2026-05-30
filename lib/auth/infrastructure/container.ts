import { prisma } from "@/lib/shared/prisma";
import { BcryptAdapter } from "./adapters/bcrypt.adapter";
import { PrismaUserRepository } from "./repositories/prisma-user.repository";
import { RegisterUseCase } from "../application/use_cases/register.use-case";
import { LoginUseCase } from "../application/use_cases/login.use-case";

export function makeAuthUseCases() {
  const userRepo = new PrismaUserRepository(prisma)
  const hashPort = new BcryptAdapter()
  return {
    register: new RegisterUseCase(userRepo, hashPort),
    login: new LoginUseCase(userRepo, hashPort)
  }
}