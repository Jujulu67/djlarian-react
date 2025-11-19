import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: process.env.NODE_ENV === 'production', // Désactiver en développement pour éviter les doubles appels
  compiler: {
    styledComponents: true,
  },
  images: {
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
    // Optimisations d'images pour la production
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  // Configuration Turbopack pour Next.js 16
  // Turbopack est activé par défaut, on ajoute une config vide pour éviter les conflits
  turbopack: {},
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
