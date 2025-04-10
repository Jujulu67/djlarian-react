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
};

module.exports = nextConfig;
