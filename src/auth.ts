import { PrismaAdapter } from '@auth/prisma-adapter';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { compare as bcryptCompare } from '@/lib/bcrypt-edge';
import prisma from '@/lib/prisma';

import { authConfig } from './auth.config';

// Configuration principale avec adaptateur Prisma et Credentials
const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    ...authConfig.providers,
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          // Retourner null au lieu de throw pour que NextAuth retourne CredentialsSignin
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email as string,
          },
          select: {
            id: true,
            email: true,
            name: true,
            hashedPassword: true,
            role: true,
            image: true,
          },
        });

        if (!user || !user.hashedPassword) {
          // Retourner null pour que NextAuth retourne CredentialsSignin
          return null;
        }

        const isPasswordValid = await bcryptCompare(
          credentials.password as string,
          user.hashedPassword
        );

        if (!isPasswordValid) {
          // Retourner null pour que NextAuth retourne CredentialsSignin
          return null;
        }

        return {
          ...user,
          role: user.role ?? undefined,
        };
      },
    }),
  ],
  callbacks: authConfig.callbacks,
  session: authConfig.session,
  pages: authConfig.pages,
  secret: secret,
  debug: false, // Désactiver le debug pour éviter les erreurs "Configuration"
});
