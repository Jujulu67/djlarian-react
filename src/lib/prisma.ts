// Utiliser Prisma Client standard avec adaptateur Neon pour Cloudflare Pages
// Quand on utilise un adaptateur, on doit utiliser @prisma/client (pas /edge)
// Le client standard avec adaptateur fonctionne en Edge Runtime grâce à engineType = "library"
import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

// Créer le client Prisma avec adaptateur Neon pour Edge Runtime
function createPrismaClient() {
  console.log('[PRISMA INIT] Début de l\'initialisation Prisma Client');
  console.log('[PRISMA INIT] Environment:', {
    CF_PAGES: process.env.CF_PAGES,
    NEXT_RUNTIME: process.env.NEXT_RUNTIME,
    NODE_ENV: process.env.NODE_ENV,
    hasProcess: typeof process !== 'undefined',
    hasNodeVersions: typeof process !== 'undefined' && !!process.versions?.node,
  });

  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('[PRISMA INIT] DATABASE_URL is not set');
    throw new Error('DATABASE_URL is not set');
  }

  console.log('[PRISMA INIT] DATABASE_URL is set (length:', connectionString.length, ')');

  // Détecter si on est en Edge Runtime (Cloudflare Pages/Workers)
  const isEdgeRuntime = 
    process.env.CF_PAGES === '1' ||
    process.env.NEXT_RUNTIME === 'edge' ||
    (typeof process === 'undefined' || !process.versions?.node);

  console.log('[PRISMA INIT] isEdgeRuntime:', isEdgeRuntime);

  if (isEdgeRuntime) {
    console.log('[PRISMA INIT] Utilisation de Prisma Client avec adaptateur Neon pour Edge Runtime');
    
    try {
      // Utiliser require pour les imports synchrones (compatible avec Next.js et Cloudflare)
      const { Pool, neonConfig } = require('@neondatabase/serverless');
      const { PrismaNeon } = require('@prisma/adapter-neon');
      
      console.log('[PRISMA INIT] Modules Neon chargés avec succès');
      
      // Configurer Neon pour Cloudflare (désactiver WebSocket)
      neonConfig.webSocketConstructor = null;
      
      // Créer le pool de connexions Neon
      const pool = new Pool({ 
        connectionString,
        max: 1, // Limiter les connexions pour Cloudflare
      });
      
      // Créer l'adaptateur Prisma pour Neon
      const adapter = new PrismaNeon(pool);
      
      // Créer Prisma Client avec l'adaptateur
      // Avec engineType = "library" dans schema.prisma, le client n'utilise pas de binaires natifs
      const client = new PrismaClient({ 
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      });
      
      console.log('[PRISMA INIT] PrismaClient avec adaptateur Neon créé avec succès');
      return client;
    } catch (error) {
      console.error('[PRISMA INIT] Erreur lors de la création du client Prisma avec adaptateur:', error);
      throw error;
    }
  }

  console.log('[PRISMA INIT] Utilisation du PrismaClient standard (Node.js runtime - développement)');
  // En Node.js runtime (développement local), utiliser le client standard
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

// Créer le client Prisma (singleton pattern)
const prisma = global.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production' && typeof global !== 'undefined') {
  global.prisma = prisma;
}

export default prisma;
