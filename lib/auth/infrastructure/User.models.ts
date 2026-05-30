import { User as PrismaUser, Role } from '../../generated/prisma'
import { email, z } from 'zod'

export type UserModel = PrismaUser
export { Role }

export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.nativeEnum(Role).default(Role.USER)
})

export type CreateUserInput = z.infer<typeof CreateUserSchema>