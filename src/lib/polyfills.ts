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

  // SOLUTION CRITIQUE: Patcher unenv AVANT que Prisma ne soit chargé
  // Le problème est que unenv crée createNotImplementedError qui est appelé pour fs.readdir
  // Il faut intercepter cette fonction ou patcher fs.readdir directement dans unenv
  
  // Créer un wrapper pour fs qui intercepte readdir
  const fsReaddirPolyfill = (path: any, options?: any, callback?: any) => {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    if (callback) {
      callback(null, []);
    } else {
      return Promise.resolve([]);
    }
  };
  
  const fsWrapper = {
    ...((globalThis as any).fs || {}),
    readdir: fsReaddirPolyfill,
    promises: {
      ...((globalThis as any).fs?.promises || {}),
      readdir: () => Promise.resolve([]),
    },
  };
  
  // Patcher globalThis.fs
  (globalThis as any).fs = fsWrapper;
  
  // SOLUTION RADICALE: Intercepter createNotImplementedError si disponible
  // unenv utilise cette fonction pour créer des erreurs pour les fonctions non implémentées
  try {
    // @ts-ignore
    if (typeof globalThis !== 'undefined' && globalThis.createNotImplementedError) {
      // @ts-ignore
      const originalCreateNotImplementedError = globalThis.createNotImplementedError;
      // @ts-ignore
      globalThis.createNotImplementedError = (name: string) => {
        // Si c'est pour fs.readdir, retourner notre polyfill au lieu d'une erreur
        if (name === 'fs.readdir' || name.includes('readdir')) {
          console.log('[POLYFILLS] Interception de createNotImplementedError pour', name);
          return fsReaddirPolyfill;
        }
        // Pour les autres fonctions, utiliser l'original
        return originalCreateNotImplementedError(name);
      };
    }
  } catch (e) {
    console.log('[POLYFILLS] Impossible de patcher createNotImplementedError:', e);
  }
  
  // Patcher unenv si disponible
  try {
    // @ts-ignore
    if (globalThis.unenv && typeof globalThis.unenv === 'object') {
      // @ts-ignore
      if (!globalThis.unenv.fs) {
        // @ts-ignore
        globalThis.unenv.fs = fsWrapper;
      } else {
        // @ts-ignore
        globalThis.unenv.fs.readdir = fsReaddirPolyfill;
        // @ts-ignore
        if (!globalThis.unenv.fs.promises) {
          // @ts-ignore
          globalThis.unenv.fs.promises = {};
        }
        // @ts-ignore
        globalThis.unenv.fs.promises.readdir = () => Promise.resolve([]);
      }
      // @ts-ignore
      if (!globalThis.unenv.os) {
        // @ts-ignore
        globalThis.unenv.os = (globalThis as any).os;
      }
      console.log('[POLYFILLS] unenv.fs patché avec succès');
    }
  } catch (e) {
    console.log('[POLYFILLS] Erreur lors du patch de unenv:', e);
  }
  
  // SOLUTION ALTERNATIVE: Utiliser un Proxy pour intercepter tous les accès à fs
  // Cela peut aider même si unenv n'est pas directement accessible
  try {
    const fsProxy = new Proxy(fsWrapper, {
      get(target: any, prop: string | symbol) {
        if (prop === 'readdir') {
          return fsReaddirPolyfill;
        }
        if (prop === 'promises') {
          return {
            readdir: () => Promise.resolve([]),
            ...target.promises,
          };
        }
        return target[prop];
      },
    });
    (globalThis as any).fs = fsProxy;
    console.log('[POLYFILLS] Proxy fs créé pour intercepter readdir');
  } catch (e) {
    console.log('[POLYFILLS] Impossible de créer un proxy pour fs:', e);
  }

  // SOLUTION ULTIME: Intercepter require() pour patcher node:fs AVANT qu'il ne soit chargé
  // Cela intercepte les imports de node:fs avant qu'unenv ne les transforme
  try {
    // @ts-ignore
    if (typeof require !== 'undefined' && typeof Module !== 'undefined') {
      // @ts-ignore
      const Module = require('module');
      // @ts-ignore
      const originalRequire = Module._load;
      // @ts-ignore
      Module._load = function(id: string, parent: any) {
        // Intercepter les imports de node:fs ou fs
        if (id === 'node:fs' || id === 'fs') {
          console.log('[POLYFILLS] Interception de require("' + id + '")');
          return fsWrapper;
        }
        // @ts-ignore
        return originalRequire.apply(this, arguments);
      };
      console.log('[POLYFILLS] Module._load patché pour intercepter node:fs');
    }
  } catch (e) {
    console.log('[POLYFILLS] Impossible de patcher Module._load:', e);
  }

  // SOLUTION ULTIME 2: Patcher Object.defineProperty pour intercepter les définitions de fs.readdir
  try {
    const originalDefineProperty = Object.defineProperty;
    // @ts-ignore - On patche Object.defineProperty pour intercepter fs.readdir
    Object.defineProperty = function(obj: any, prop: string | symbol, descriptor: PropertyDescriptor): any {
      // Si on essaie de définir fs.readdir, utiliser notre polyfill
      if (prop === 'readdir' && (obj === (globalThis as any).fs || obj?.constructor?.name === 'fs')) {
        console.log('[POLYFILLS] Interception de Object.defineProperty pour fs.readdir');
        return originalDefineProperty.call(this, obj, prop, {
          ...descriptor,
          value: fsReaddirPolyfill,
          get: () => fsReaddirPolyfill,
        });
      }
      return originalDefineProperty.apply(this, arguments as any);
    };
    console.log('[POLYFILLS] Object.defineProperty patché pour intercepter fs.readdir');
  } catch (e) {
    console.log('[POLYFILLS] Impossible de patcher Object.defineProperty:', e);
  }

  console.log('[POLYFILLS] Polyfills Cloudflare initialisés pour node:os et fs.readdir');
}

export {};

