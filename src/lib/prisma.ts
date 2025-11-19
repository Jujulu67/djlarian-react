// IMPORTANT: Importer les polyfills AVANT Prisma pour qu'ils soient disponibles
// au moment du chargement de Prisma Client
import '@/lib/polyfills';

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
    console.log('[PRISMA INIT] Utilisation de l\'adaptateur Neon pour Edge Runtime');
    
    // Utiliser l'adaptateur Neon pour Edge Runtime
    // IMPORTANT: Utiliser des imports dynamiques pour éviter les problèmes de bundling
    // et pour que les modules soient chargés uniquement quand nécessaire
    try {
      console.log('[PRISMA INIT] Tentative de chargement de @neondatabase/serverless...');
      // Imports dynamiques pour éviter que Prisma soit bundlé avec fs
      const { Pool, neonConfig } = require('@neondatabase/serverless');
      console.log('[PRISMA INIT] @neondatabase/serverless chargé avec succès');
      
      console.log('[PRISMA INIT] Tentative de chargement de @prisma/adapter-neon...');
      const { PrismaNeon } = require('@prisma/adapter-neon');
      console.log('[PRISMA INIT] @prisma/adapter-neon chargé avec succès');
      
      // Configurer Neon pour Cloudflare
      // Désactiver WebSocket qui n'est pas supporté dans Cloudflare Workers
      if (typeof globalThis !== 'undefined') {
        console.log('[PRISMA INIT] Configuration neonConfig.webSocketConstructor = null');
        neonConfig.webSocketConstructor = null;
      }
      
      console.log('[PRISMA INIT] Création du Pool Neon...');
      // Créer le pool avec la configuration appropriée pour Cloudflare
      const pool = new Pool({ 
        connectionString,
        max: 1, // Limiter les connexions pour Cloudflare
      });
      console.log('[PRISMA INIT] Pool Neon créé avec succès');
      
      console.log('[PRISMA INIT] Création de l\'adaptateur PrismaNeon...');
      // Utiliser PrismaNeon avec le pool
      const adapter = new PrismaNeon(pool);
      console.log('[PRISMA INIT] Adaptateur PrismaNeon créé avec succès');
      
      console.log('[PRISMA INIT] Création du PrismaClient avec adaptateur...');
      
      // SOLUTION: Patcher Prisma pour empêcher la détection des binaires natifs
      // Prisma essaie d'utiliser fs.readdir pour détecter les binaires même avec l'adaptateur
      // On doit patcher getCurrentBinaryTarget pour qu'il ne cherche pas les binaires
      try {
        // @ts-ignore
        const prismaModule = require('@prisma/client/runtime/library');
        if (prismaModule && prismaModule.getCurrentBinaryTarget) {
          const originalGetCurrentBinaryTarget = prismaModule.getCurrentBinaryTarget;
          // @ts-ignore
          prismaModule.getCurrentBinaryTarget = async () => {
            // Retourner un target qui n'existe pas pour forcer l'utilisation de l'adaptateur
            return 'unknown';
          };
          console.log('[PRISMA INIT] getCurrentBinaryTarget patché pour éviter fs.readdir');
        }
      } catch (e) {
        console.log('[PRISMA INIT] Impossible de patcher getCurrentBinaryTarget:', e);
      }
      
      // Créer Prisma Client avec l'adaptateur
      // IMPORTANT: Ne pas utiliser de chemins relatifs qui nécessitent fs
      const client = new PrismaClient({ 
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      } as any);
      console.log('[PRISMA INIT] PrismaClient créé avec succès');
      
      return client;
    } catch (error) {
      console.error('[PRISMA INIT] Erreur lors de la création du client Prisma avec adaptateur Neon:', error);
      console.error('[PRISMA INIT] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
        constructor: error?.constructor?.name,
      });
      throw error;
    }
  }

  console.log('[PRISMA INIT] Utilisation du PrismaClient standard (Node.js runtime)');
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
