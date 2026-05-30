import bcrypt from 'bcrypt'
import { IHashPort } from '../../domain/ports/IHashPort.port'

export class BcryptAdapter implements IHashPort {
  private readonly rounds = 12

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.rounds)
  }
  compare(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed)
  }

}