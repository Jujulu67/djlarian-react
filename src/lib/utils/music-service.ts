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
      imageId: 'summer_vibes',
      audioUrl: '/music/summer_vibes.mp3',
      duration: 240,
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
      imageId: 'midnight_drive',
      audioUrl: '/music/midnight_drive.mp3',
      duration: 122,
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
      imageId: 'techno_nights',
      audioUrl: '/music/techno_nights.mp3',
      duration: 140,
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
      imageId: 'larian_live',
      audioUrl: '/music/larian_live.mp3',
      duration: 3600,
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
      imageId: 'remix_project',
      audioUrl: '/music/remix_project.mp3',
      duration: 240,
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
      title: 'Vivaldi - Winter',
      artist: 'The Four Seasons',
      imageId: 'classical_winter',
      audioUrl: '/music/vivaldi_winter.mp3',
      duration: 185,
      releaseDate: '1725-01-01',
      genre: ['Classical'],
      description: 'A masterpiece of Baroque music, evoking the chill of winter.',
      type: 'single',
      platforms: {
        youtube: { url: 'https://www.youtube.com/watch?v=TZCfydWF48c' },
      },
    },
    {
      id: '7',
      title: 'Strobe',
      artist: 'deadmau5',
      imageId: 'deadmau5_strobe',
      audioUrl: '/music/deadmau5_strobe.mp3',
      duration: 635,
      releaseDate: '2009-09-03',
      genre: ['Progressive House'],
      description:
        'An iconic electronic track known for its slow build and atmospheric progression.',
      type: 'single',
      platforms: {
        spotify: { url: 'https://open.spotify.com/track/7cnGZ0L7L5EB3LhWvO21s4' },
        youtube: { url: 'https://www.youtube.com/watch?v=tKi9Z-f6qX4' },
      },
    },
    {
      id: '8',
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      imageId: 'queen_bohemian',
      audioUrl: '/music/queen_bohemian.mp3',
      duration: 354,
      releaseDate: '1975-10-31',
      genre: ['Rock', 'Opera'],
      description: 'A legendary rock opera in miniature, blending different musical styles.',
      type: 'single',
      platforms: {
        spotify: { url: 'https://open.spotify.com/track/3z8h0TU7ReDPLIbEnYhWZb' },
        apple: {
          url: 'https://music.apple.com/us/album/bohemian-rhapsody/1440801019?i=1440801162',
        },
      },
    },
    {
      id: '9',
      title: 'Never Gonna Give You Up',
      artist: 'Rick Astley',
      imageId: 'rick_astley_never',
      audioUrl: '/music/rick_astley_never.mp3',
      duration: 213,
      releaseDate: '1987-07-27',
      genre: ['Pop', 'Dance'],
      description: 'The quintessential 80s pop anthem, famous for... other reasons.',
      type: 'single',
      platforms: {
        youtube: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
        spotify: { url: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC' },
      },
    },
    {
      id: '10',
      title: 'Take On Me',
      artist: 'a-ha',
      imageId: 'aha_takeonme',
      audioUrl: '/music/aha_takeonme.mp3',
      duration: 225,
      releaseDate: '1985-09-16',
      genre: ['Synth-pop'],
      description: 'An iconic synth-pop hit with a memorable music video.',
      type: 'single',
      platforms: {
        spotify: { url: 'https://open.spotify.com/track/2WfaOiMkCvy7F5fcp2zZ8L' },
        youtube: { url: 'https://www.youtube.com/watch?v=djV11Xbc914' },
      },
    },
    {
      id: '11',
      title: 'Live Set @ Tomorrowland 2023',
      artist: 'DJ Larian',
      imageId: 'tomorrowland_live',
      audioUrl: '/music/live_set_tomorrowland.mp3',
      duration: 3600,
      releaseDate: '2023-07-28',
      genre: ['EDM', 'House'],
      description: 'Relive the energy of the mainstage performance at Tomorrowland.',
      type: 'djset',
      platforms: {
        soundcloud: { url: 'https://soundcloud.com/djlarian/live-tomorrowland-2023' },
        youtube: { url: 'https://www.youtube.com/watch?v=example_live_set' },
      },
    },
  ];
};
