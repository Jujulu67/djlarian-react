import { Track, MusicPlatform } from './types';

// Regex pour extraire les IDs depuis les URLs
const SPOTIFY_REGEX = /spotify\.com\/(?:track|album|playlist)\/([a-zA-Z0-9]+)/;
const YOUTUBE_REGEX = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/;
const SOUNDCLOUD_REGEX = /soundcloud\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/;

/**
 * Extrait l'ID d'une plateforme à partir d'une URL
 */
export const extractPlatformId = (url: string, platform: MusicPlatform): string | null => {
  switch (platform) {
    case 'spotify':
      const spotifyMatch = url.match(SPOTIFY_REGEX);
      return spotifyMatch ? spotifyMatch[1] : null;

    case 'youtube':
      const youtubeMatch = url.match(YOUTUBE_REGEX);
      return youtubeMatch ? youtubeMatch[1] : null;

    case 'soundcloud':
      const soundcloudMatch = url.match(SOUNDCLOUD_REGEX);
      return soundcloudMatch ? `${soundcloudMatch[1]}/${soundcloudMatch[2]}` : null;

    default:
      return null;
  }
};

/**
 * Génère l'URL d'embedding pour une plateforme
 */
export const getEmbedUrl = (url: string, platform: MusicPlatform): string | null => {
  const id = extractPlatformId(url, platform);
  if (!id) return null;

  switch (platform) {
    case 'spotify':
      return `https://open.spotify.com/embed/track/${id}`;

    case 'youtube':
      return `https://www.youtube.com/embed/${id}`;

    case 'soundcloud':
      return `https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/${id}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`;

    default:
      return null;
  }
};

/**
 * Extrait le thumbnail d'une vidéo YouTube
 */
export const getYouTubeThumbnail = (url: string): string | null => {
  const id = extractPlatformId(url, 'youtube');
  if (!id) return null;

  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
};

// Données de test pour la démo - à remplacer par des données API réelles
export const getDemoTracks = (): Track[] => {
  return [
    {
      id: '1',
      title: 'Summer Vibes',
      artist: 'DJ Larian',
      coverUrl: 'https://i.scdn.co/image/ab67616d0000b273e8125c2c1022e89cbb52471a',
      releaseDate: '2024-03-15',
      genre: ['House', 'Electronic'],
      type: 'single',
      featured: true,
      bpm: 128,
      platforms: {
        spotify: {
          url: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
          embedId: '4cOdK2wGLETKBW3PvgPWqT',
        },
        youtube: {
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          embedId: 'dQw4w9WgXcQ',
        },
      },
    },
    {
      id: '2',
      title: 'Midnight Drive',
      artist: 'DJ Larian',
      coverUrl: 'https://i.scdn.co/image/ab67616d0000b2735f4072e0fbf491f6c1419b68',
      releaseDate: '2024-02-20',
      genre: ['Deep House', 'Progressive'],
      type: 'ep',
      bpm: 122,
      platforms: {
        spotify: {
          url: 'https://open.spotify.com/track/5E30LdtzQTGqRvNd7l6kG5',
          embedId: '5E30LdtzQTGqRvNd7l6kG5',
        },
        soundcloud: {
          url: 'https://soundcloud.com/larian67/midnight-drive',
          embedId: 'larian67/midnight-drive',
        },
      },
    },
    {
      id: '3',
      title: 'Techno Nights',
      artist: 'DJ Larian',
      coverUrl: 'https://i.scdn.co/image/ab67616d0000b2737c2b0cee2b4471d2fd968e64',
      releaseDate: '2024-01-10',
      genre: ['Techno', 'Dark Techno'],
      type: 'single',
      bpm: 140,
      platforms: {
        spotify: {
          url: 'https://open.spotify.com/track/6cy3ki6QwJYfS9NcaOpKpH',
          embedId: '6cy3ki6QwJYfS9NcaOpKpH',
        },
      },
    },
    {
      id: '4',
      title: 'Larian Live @ Club XYZ',
      artist: 'DJ Larian',
      coverUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      releaseDate: '2023-12-15',
      genre: ['Live Set', 'House', 'Techno'],
      type: 'live',
      platforms: {
        youtube: {
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          embedId: 'dQw4w9WgXcQ',
        },
      },
    },
    {
      id: '5',
      title: 'Remix Project (feat. Various Artists)',
      artist: 'DJ Larian',
      coverUrl: 'https://i.scdn.co/image/ab67616d0000b2737e13de3fc3a3a37f097d5677',
      releaseDate: '2023-11-20',
      genre: ['Remix', 'House', 'Techno'],
      type: 'remix',
      platforms: {
        soundcloud: {
          url: 'https://soundcloud.com/larian67/remix-project',
          embedId: 'larian67/remix-project',
        },
      },
    },
    {
      id: '6',
      title: 'Summer Mix 2023',
      artist: 'DJ Larian',
      coverUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
      releaseDate: '2023-07-01',
      genre: ['DJ Set', 'Mixed'],
      type: 'djset',
      platforms: {
        youtube: {
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          embedId: 'dQw4w9WgXcQ',
        },
        soundcloud: {
          url: 'https://soundcloud.com/larian67/summer-mix-2023',
          embedId: 'larian67/summer-mix-2023',
        },
      },
    },
  ];
};
