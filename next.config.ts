import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  // Optimisation majeure pour Vercel : ne bundle que le strict nécessaire
  output: 'standalone',
  reactStrictMode: true, // Activé pour détecter les problèmes potentiels en développement
  // Configuration pour Puppeteer/Chromium sur Vercel
  // Ces packages doivent être externes pour fonctionner correctement dans l'environnement serverless
  serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium-min'],
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
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Google OAuth avatars
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
  // Exclure explicitement puppeteer du tracing Vercel pour éviter de dépasser les 250MB
  // @ts-ignore - Option valide dans Next.js 15+ mais manquante dans les types actuels
  outputFileTracingExcludes: {
    '*': [
      './node_modules/puppeteer',
      './node_modules/puppeteer/**/*',
      './node_modules/typescript',
      './node_modules/typescript/**/*',
      './node_modules/@types',
      './node_modules/@types/**/*',
      './node_modules/better-sqlite3',
      // Exclure les gros fichiers statiques qui sont servis par le CDN
      './public/uploads/**/*',
      './public/assets/**/*',
      './public/gifs/**/*',
      './public/images/**/*',
      './public/audio/**/*',
    ],
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

  // Headers de sécurité HTTP
  async headers() {
    return [
      {
        // Appliquer les headers de sécurité à toutes les routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

// Wrap the Next.js config with Sentry if DSN is configured
// This allows Sentry to be optional - it will only be active if NEXT_PUBLIC_SENTRY_DSN is set
const sentryEnabled = !!process.env.NEXT_PUBLIC_SENTRY_DSN;

const sentryConfig = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Ne configurer org/project que si on veut uploader les source maps
  // Si SENTRY_AUTH_TOKEN n'a pas les permissions, ne pas configurer org/project
  // pour éviter les erreurs 403 lors du build
  ...(process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_DISABLE_SOURCEMAPS !== 'true'
    ? {
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
      }
    : {}),

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Désactiver l'upload des source maps si le token n'est pas configuré ou si explicitement désactivé
  // Les erreurs seront toujours capturées via le DSN, mais sans source maps
  // Pour activer l'upload des source maps, le token doit avoir les permissions: project:releases, project:write
  dryRun: !process.env.SENTRY_AUTH_TOKEN || process.env.SENTRY_DISABLE_SOURCEMAPS === 'true',

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your API bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: '/monitoring',

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors.
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
};

// Conditionally wrap with Sentry - if DSN is not set, Sentry config files will handle gracefully
export default sentryEnabled ? withSentryConfig(nextConfig, sentryConfig) : nextConfig;
