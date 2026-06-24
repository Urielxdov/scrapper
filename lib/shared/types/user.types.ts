export interface IUser {
  id: string;
  email: string;
}

export interface IUserRepository {
  findById(id: string): Promise<IUser | null>;
}
