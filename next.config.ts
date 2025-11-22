import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true, // Activé pour détecter les problèmes potentiels en développement
  compiler: {
    styledComponents: true,
  },
  images: {
    // Loader personnalisé pour gérer les images servies via l'API
    loader: 'custom',
    loaderFile: './imageLoader.ts',
    // Migration de domains vers remotePatterns (Next.js 16)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.scdn.co', // Images Spotify
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com', // Thumbnails YouTube
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com', // Autres thumbnails YouTube
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com', // GitHub Avatars
      },
      {
        protocol: 'https',
        hostname: 'cdn-images-1.medium.com', // Medium images
      },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com', // Vercel Blob Storage
      },
    ],
    // Configuration pour les images locales avec query strings (cache busting)
    // Permet d'utiliser des query strings comme ?t=timestamp pour forcer le rechargement
    // Note: Les query strings sont autorisées pour tous les patterns locaux
    localPatterns: [
      {
        pathname: '/uploads/**',
      },
      {
        pathname: '/images/**',
      },
    ],
    // Optimisations d'images pour la production
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  // Configuration pour Prisma 7 avec tsx
  // Avec tsx loader, Node.js peut charger directement les fichiers .ts de Prisma
  // Turbopack peut maintenant être utilisé car les fichiers .ts sont gérés par tsx à l'exécution
  //
  // Approche inspirée de Trigger.dev : marquer Prisma comme dépendance externe
  // Prisma 7 utilise un client Rust-free qui ne doit pas être bundlé
  // Référence: https://trigger.dev/changelog/prisma-7-integration
  //
  // Configuration Turbopack (vide car Prisma est géré par tsx à l'exécution)
  turbopack: {},
  // Configuration webpack conservée pour compatibilité si --webpack est utilisé explicitement
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Marquer @prisma/client et .prisma/client comme externes
      // Cela empêche Next.js de bundler/compiler les fichiers TypeScript de Prisma
      // et permet à Node.js (avec tsx) de les charger directement à l'exécution
      const externals = config.externals || [];
      config.externals = [
        ...(Array.isArray(externals) ? externals : [externals]),
        {
          '@prisma/client': 'commonjs @prisma/client',
          '.prisma/client': 'commonjs .prisma/client',
        },
      ];
    }
    return config;
  },
  // Ignorer les erreurs d'hydratation causées par les extensions comme BitDefender
  onDemandEntries: {
    // période en ms pendant laquelle la page sera gardée en mémoire
    maxInactiveAge: 25 * 1000,
    // nombre de pages à garder en mémoire
    pagesBufferLength: 2,
  },
  // Déplacé de experimental à la racine de la configuration
  skipTrailingSlashRedirect: true,
  // Optimisations de production
  poweredByHeader: false, // Retirer le header X-Powered-By pour la sécurité
  compress: true, // Activer la compression gzip
  // Note: swcMinify est activé par défaut avec Turbopack dans Next.js 16
};

export default nextConfig;
