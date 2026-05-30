import { User } from './user.entity';
import { randomUUID } from 'crypto'; // Node nativo para generar UUIDs reales

describe('User entity', () => {
  it('creates valid user', () => {
    // Generamos un UUID real para que pase la validación de Zod
    const validId = randomUUID();

    const user = new User(validId, 'test@gmail.com', '123456', 'USER');

    expect(user.id).toBe(validId);
    expect(user.email).toBe('test@gmail.com');
  });

  it('rejects invalid email', () => {
    const validId = randomUUID();

    // Cambiamos 'Invalid email' por el mensaje real que configuraste en Zod
    expect(() => new User(validId, 'not-an-email', '123456', 'USER'))
      .toThrow('Formato de correo inválido');
  });
});