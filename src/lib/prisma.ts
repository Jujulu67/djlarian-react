import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

// Créer le client Prisma avec adaptateur Neon pour Edge Runtime
function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  // Détecter si on est en Edge Runtime (Cloudflare Pages/Workers)
  const isEdgeRuntime = 
    process.env.CF_PAGES === '1' ||
    process.env.NEXT_RUNTIME === 'edge' ||
    (typeof process === 'undefined' || !process.versions?.node);

  if (isEdgeRuntime) {
    // Utiliser l'adaptateur Neon pour Edge Runtime
    // Import synchrones - les modules seront chargés dynamiquement au runtime
    try {
      const { Pool } = require('@neondatabase/serverless');
      const { PrismaNeon } = require('@prisma/adapter-neon');
      
      const pool = new Pool({ connectionString });
      const adapter = new PrismaNeon(pool);
      return new PrismaClient({ adapter } as any);
    } catch (error) {
      // Fallback si les modules ne sont pas disponibles
      console.warn('Neon adapter not available, using standard Prisma Client');
      return new PrismaClient();
    }
  }

  // En Node.js runtime (développement local), utiliser le client standard
  return new PrismaClient();
}

const prisma = global.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production' && typeof global !== 'undefined') {
  global.prisma = prisma;
}

export default prisma;
