/**
 * Polyfills pour Cloudflare Workers/Pages
 * 
 * Ces polyfills sont nécessaires car Prisma Client essaie d'utiliser
 * des modules Node.js qui ne sont pas disponibles dans l'environnement Cloudflare.
 * 
 * IMPORTANT: Ce fichier doit être importé AVANT tout import de Prisma
 * pour que les polyfills soient disponibles au moment du chargement.
 */

// Détecter si on est dans un environnement Cloudflare
const isCloudflare = 
  typeof globalThis !== 'undefined' &&
  ((globalThis as any).CF_PAGES === '1' || 
   (typeof process !== 'undefined' && process.env?.CF_PAGES === '1') ||
   typeof process === 'undefined' || 
   !process.versions?.node ||
   (typeof navigator !== 'undefined' && navigator.userAgent?.includes('Cloudflare')));

if (isCloudflare && typeof globalThis !== 'undefined') {
  // Polyfill pour node:os
  // Prisma utilise os.platform() et os.arch() pour détecter la plateforme
  if (!(globalThis as any).os) {
    (globalThis as any).os = {
      platform: () => 'cloudflare',
      arch: () => 'wasm32',
      type: () => 'Cloudflare Workers',
      release: () => '',
      homedir: () => '/',
      tmpdir: () => '/tmp',
      hostname: () => 'cloudflare-worker',
      cpus: () => [],
      totalmem: () => 0,
      freemem: () => 0,
      networkInterfaces: () => ({}),
      getPriority: () => 0,
      setPriority: () => {},
      userInfo: () => ({ username: '', uid: 0, gid: 0, shell: '' }),
      loadavg: () => [0, 0, 0],
      uptime: () => 0,
      endianness: () => 'LE',
      EOL: '\n',
      constants: {},
    };
  }

  // Polyfill pour fs.readdir
  // Prisma essaie d'utiliser fs.readdir pour détecter les binaires natifs
  // Avec l'adaptateur Neon, on n'a pas besoin de binaires, donc on retourne un tableau vide
  if (!(globalThis as any).fs) {
    (globalThis as any).fs = {};
  }
  
  if (!(globalThis as any).fs.readdir) {
    (globalThis as any).fs.readdir = (path: any, options?: any, callback?: any) => {
      // Gérer les différents formats d'appel
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }
      
      if (callback) {
        // Format callback
        callback(null, []);
      } else {
        // Format promesse
        return Promise.resolve([]);
      }
    };
  }
  
  if (!(globalThis as any).fs.promises) {
    (globalThis as any).fs.promises = {
      readdir: () => Promise.resolve([]),
    };
  }

  // Dans Cloudflare Workers avec OpenNext, les modules node:os et node:fs sont externalisés
  // et doivent être fournis via les polyfills globaux.
  // Le problème est que Prisma utilise require() qui peut ne pas être interceptable.
  // 
  // Solution: S'assurer que les polyfills sont disponibles dans globalThis
  // et que Prisma peut les trouver via les chemins de modules standard.
  
  // Créer des alias de modules dans globalThis pour que require() puisse les trouver
  // @ts-ignore
  if (typeof globalThis.require !== 'undefined') {
    // Créer un cache de modules pour intercepter les require
    // @ts-ignore
    const moduleCache: Record<string, any> = {};
    // @ts-ignore
    moduleCache['node:os'] = (globalThis as any).os;
    // @ts-ignore
    moduleCache['os'] = (globalThis as any).os;
    // @ts-ignore
    moduleCache['node:fs'] = (globalThis as any).fs;
    // @ts-ignore
    moduleCache['fs'] = (globalThis as any).fs;
    
    // Stocker le cache dans globalThis pour qu'il soit accessible
    // @ts-ignore
    globalThis.__polyfillModuleCache = moduleCache;
  }
  
  // Note: Dans Cloudflare Workers, les modules externalisés sont résolus différemment.
  // Les polyfills globaux (globalThis.os et globalThis.fs) devraient être suffisants
  // si OpenNext/Cloudflare résout correctement les modules externalisés.

  // Intercepter les imports dynamiques de node:os
  // Note: Les imports ES modules ne peuvent pas être interceptés de cette manière,
  // mais Prisma utilise généralement require() pour ces modules
  console.log('[POLYFILLS] Polyfills Cloudflare initialisés pour node:os et fs.readdir');
}

export {};

