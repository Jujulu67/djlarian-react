/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compiler: {
    styledComponents: true,
  },
  images: {
    domains: [
      'i.scdn.co', // Images Spotify
      'i.ytimg.com', // Thumbnails YouTube
      'img.youtube.com', // Autres thumbnails YouTube
      'avatars.githubusercontent.com', // GitHub Avatars (si utilisé)
      'cdn-images-1.medium.com', // Medium images (si utilisé)
    ],
  },
  webpack: (config) => {
    return config;
  },
  env: {
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
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
  // Cette option est cruciale pour ignorer les erreurs d'hydratation spécifiques
  experimental: {
    // Aucun plugin expérimental n'est nécessaire pour le moment
  },
};

module.exports = nextConfig;
