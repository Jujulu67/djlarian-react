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
    // IMPORTANT: Utiliser des imports dynamiques pour éviter les problèmes de bundling
    // et pour que les modules soient chargés uniquement quand nécessaire
    try {
      // Imports dynamiques pour éviter que Prisma soit bundlé avec fs
      const { Pool, neonConfig } = require('@neondatabase/serverless');
      const { PrismaNeon } = require('@prisma/adapter-neon');
      
      // Configurer Neon pour Cloudflare
      // Désactiver WebSocket qui n'est pas supporté dans Cloudflare Workers
      if (typeof globalThis !== 'undefined') {
        neonConfig.webSocketConstructor = null;
      }
      
      // Créer le pool avec la configuration appropriée pour Cloudflare
      const pool = new Pool({ 
        connectionString,
        max: 1, // Limiter les connexions pour Cloudflare
      });
      
      // Utiliser PrismaNeon avec le pool
      const adapter = new PrismaNeon(pool);
      
      // Créer Prisma Client avec l'adaptateur
      // IMPORTANT: Ne pas utiliser de chemins relatifs qui nécessitent fs
      return new PrismaClient({ 
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      } as any);
    } catch (error) {
      console.error('Erreur lors de la création du client Prisma avec adaptateur Neon:', error);
      throw error;
    }
  }

  // En Node.js runtime (développement local), utiliser le client standard
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

const prisma = global.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production' && typeof global !== 'undefined') {
  global.prisma = prisma;
}

export default prisma;
