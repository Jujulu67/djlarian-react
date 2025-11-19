// Utiliser Prisma Client Edge pour Cloudflare Pages
// Le client Edge est conçu pour les environnements Edge et n'utilise pas de binaires natifs
import { PrismaClient } from '@prisma/client/edge';

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
    console.log('[PRISMA INIT] Utilisation de Prisma Client Edge avec adaptateur Neon');
    
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
      
      // Créer Prisma Client Edge avec l'adaptateur
      // Le client Edge n'utilise pas de binaires natifs, donc pas besoin de fs.readdir
      const client = new PrismaClient({ 
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      });
      
      console.log('[PRISMA INIT] PrismaClient Edge créé avec succès');
      return client;
    } catch (error) {
      console.error('[PRISMA INIT] Erreur lors de la création du client Prisma Edge:', error);
      throw error;
    }
  }

  console.log('[PRISMA INIT] Utilisation du PrismaClient Edge (Node.js runtime - développement)');
  // En Node.js runtime (développement local), utiliser aussi le client Edge pour la cohérence
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
