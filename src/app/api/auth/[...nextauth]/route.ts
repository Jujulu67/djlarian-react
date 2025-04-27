import NextAuth from 'next-auth';
// Importer seulement authOptions
import { authOptions } from '@/lib/auth/options';

// Supprimer les imports et la définition locale de authOptions
/*
import GoogleProvider from 'next-auth/providers/google';
import TwitchProvider from 'next-auth/providers/twitch';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

const globalForPrisma = ...;
const prisma = ...;

export const authOptions: AuthOptions = { ... };
*/

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
