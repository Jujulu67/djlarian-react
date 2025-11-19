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

  // Dans Cloudflare Workers, Prisma utilise 'unenv' qui n'a pas implémenté fs.readdir
  // Nous devons patcher le système de modules pour intercepter les appels avant qu'ils n'atteignent unenv
  
  // Patcher le système de résolution de modules pour intercepter fs et os
  try {
    // Intercepter require() si disponible
    // @ts-ignore
    if (typeof require !== 'undefined') {
      // @ts-ignore
      const originalRequire = require;
      // Créer un wrapper pour intercepter les appels
      const interceptedRequire = (id: string) => {
        if (id === 'node:os' || id === 'os') {
          return (globalThis as any).os;
        }
        if (id === 'node:fs' || id === 'fs') {
          return (globalThis as any).fs;
        }
        // Pour les autres modules, utiliser le require original
        try {
          return originalRequire(id);
        } catch (e) {
          // Si le module n'existe pas, essayer nos polyfills
          if (id === 'node:os' || id === 'os') {
            return (globalThis as any).os;
          }
          if (id === 'node:fs' || id === 'fs') {
            return (globalThis as any).fs;
          }
          throw e;
        }
      };
      
      // Remplacer require dans le contexte global si possible
      // @ts-ignore
      if (typeof globalThis.require === 'undefined') {
        // @ts-ignore
        globalThis.require = interceptedRequire;
      }
    }
  } catch (e) {
    console.log('[POLYFILLS] Impossible de patcher require:', e);
  }

  // Patcher le système unenv si disponible
  // unenv est utilisé par Cloudflare Workers pour fournir des polyfills
  try {
    // @ts-ignore
    if (typeof globalThis !== 'undefined' && globalThis.unenv) {
      // @ts-ignore
      const unenv = globalThis.unenv;
      if (unenv && typeof unenv === 'object') {
        // Patcher fs dans unenv
        if (!unenv.fs) {
          unenv.fs = (globalThis as any).fs;
        } else {
          // Si fs existe déjà, patcher readdir
          if (!unenv.fs.readdir) {
            unenv.fs.readdir = (globalThis as any).fs.readdir;
          }
        }
        // Patcher os dans unenv
        if (!unenv.os) {
          unenv.os = (globalThis as any).os;
        }
      }
    }
  } catch (e) {
    // Ignorer si unenv n'est pas disponible
  }

  // Créer un proxy pour intercepter les accès aux propriétés de fs
  // Cela peut aider à intercepter les appels même si require() n'est pas patchable
  try {
    const fsPolyfill = (globalThis as any).fs;
    if (fsPolyfill && !fsPolyfill._patched) {
      // Créer un proxy pour intercepter tous les accès
      const fsProxy = new Proxy(fsPolyfill, {
        get(target: any, prop: string | symbol) {
          if (prop === 'readdir') {
            return target.readdir || ((path: any, options?: any, callback?: any) => {
              if (typeof options === 'function') {
                callback = options;
                options = {};
              }
              if (callback) {
                callback(null, []);
              } else {
                return Promise.resolve([]);
              }
            });
          }
          return target[prop];
        }
      });
      (globalThis as any).fs = fsProxy;
      (globalThis as any).fs._patched = true;
    }
  } catch (e) {
    console.log('[POLYFILLS] Impossible de créer un proxy pour fs:', e);
  }

  console.log('[POLYFILLS] Polyfills Cloudflare initialisés pour node:os et fs.readdir');
}

export {};

