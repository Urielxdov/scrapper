// /lib/auth/infrastructure/adapters/auth.ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './authjs.config';
import { makeAuthUseCases } from '../container';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        console.log('[auth][authorize] credentials email:', credentials.email);
        // Esto corre seguro aquí porque este archivo no lo toca el middleware
        const { login } = makeAuthUseCases();
        const user = await login.execute({
          email: credentials.email as string,
          password: credentials.password as string,
        });

        console.log('[auth][authorize] login result user:', user ? user.id : null);

        if (!user) return null;
        return { id: user.id, email: user.email, role: user.role };
      },
    }),
  ],
});