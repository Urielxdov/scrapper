import { Role } from '../../../generated/prisma'
import { z } from 'zod'

// Valida: cualquier letra/número seguido de un punto y una extensión de 2 o más letras
const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

// Reglas de negocio
export const UserRules = z.object({
  id: z.string().uuid(),
  email: z.string()
    .email("Formato de correo inválido")
    .refine(
      val => {
        const domain = val.split('@')['1']
        return domainRegex.test(domain)
      },
      { message: "El dominio del correo no tiene una estructura válida (ej. dominio.com)" }
    ),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  role: z.enum(['ADMIN', 'USER'] as const, {
    message: "El rol seleccionado no es valido"
  }),
  createdAt: z.date().default(() => new Date())
})


export class User {
  public readonly id: string;
  public readonly email: string;
  public readonly password: string;
  public readonly role: Role;
  public readonly createdAt: Date;


  constructor(id: string, email: string, password: string, role: Role, createdAt?: Date) {
    // 🎯 Zod valida los parámetros aquí. Si algo falla, lanza un ZodError inmediatamente.
    const validated = UserRules.parse({ id, email, password, role, createdAt });

    this.id = validated.id;
    this.email = validated.email;
    this.password = validated.password;
    this.role = validated.role;
    this.createdAt = validated.createdAt;
  }
}