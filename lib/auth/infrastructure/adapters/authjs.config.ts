import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { makeAuthUseCases } from '../container';

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const { login } = makeAuthUseCases();
        const user = await login.execute({
          email: credentials.email as string,
          password: credentials.password as string,
        });
        if (!user) return null;
        return { id: user.id, email: user.email, role: user.role };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = (user as { role: string }).role;
      return token;
    },
    session({ session, token }) {
      if (session.user) (session.user as { role?: string }).role = token.role as string;
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);