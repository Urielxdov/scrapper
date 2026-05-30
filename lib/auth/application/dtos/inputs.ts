/**
 * DTOs de entrada para casos de uso de autenticación
 * Centralizados según convenciones de Clean Architecture
 */

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  email: string
  password: string
}
