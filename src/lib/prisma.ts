// Prisma Client pour Vercel (Node.js runtime natif)
// Plus besoin d'adaptateurs ou de hacks - tout fonctionne nativement
import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

// Créer le client Prisma (singleton pattern)
// Sur Vercel, le runtime Node.js supporte nativement Prisma
const prisma: PrismaClient =
  global.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
