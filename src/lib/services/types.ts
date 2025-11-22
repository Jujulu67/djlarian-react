/**
 * Types pour les services d'auto-détection de releases
 */

export interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  external_urls: {
    spotify: string;
  };
  images?: Array<{
    url: string;
    height: number;
    width: number;
  }>;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  album_type: 'album' | 'single' | 'compilation';
  release_date: string;
  release_date_precision: 'year' | 'month' | 'day';
  external_urls: {
    spotify: string;
  };
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
  artists: SpotifyArtist[];
  total_tracks: number;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  duration_ms: number;
  external_urls: {
    spotify: string;
  };
  album: SpotifyAlbum;
  artists: SpotifyArtist[];
  preview_url: string | null;
}

export interface SpotifyReleasesResponse {
  items: SpotifyAlbum[];
  total: number;
  limit: number;
  offset: number;
}

export interface SpotifyArtistSearchResponse {
  artists: {
    items: SpotifyArtist[];
    total: number;
  };
}

export interface DetectedRelease {
  id: string;
  title: string;
  artist: string;
  releaseDate: string;
  type: 'single' | 'ep' | 'album' | 'remix' | 'live' | 'djset' | 'video';
  spotifyUrl: string;
  spotifyId: string;
  imageUrl?: string;
  duration?: number;
  exists: boolean;
  isScheduled?: boolean; // true si la release est planifiée (date dans le futur)
  genres?: string[];
  description?: string;
}

export interface MusicBrainzRelease {
  id: string;
  title: string;
  'release-group'?: {
    'primary-type'?: string;
    'secondary-types'?: string[];
    'first-release-date'?: string;
  };
  date?: string;
  'artist-credit'?: Array<{
    artist: {
      name: string;
    };
  }>;
  'tag-list'?: Array<{
    name: string;
    count: number;
  }>;
}

export interface MusicBrainzSearchResponse {
  releases: MusicBrainzRelease[];
  count: number;
}

export interface LastFmTrack {
  name: string;
  artist: {
    name: string;
  };
  album?: {
    title: string;
  };
  tags?: {
    tag: Array<{
      name: string;
      url: string;
    }>;
  };
  wiki?: {
    content: string;
    summary: string;
  };
  duration?: string;
}

export interface LastFmTrackInfoResponse {
  track: LastFmTrack;
}

export interface PlatformSearchResult {
  youtube?: {
    url: string;
    embedId: string;
    title: string;
    thumbnail?: string;
  };
  soundcloud?: {
    url: string;
    embedId?: string;
    title: string;
  };
  apple?: {
    url: string;
    title: string;
  };
  deezer?: {
    url: string;
    embedId: string;
    title: string;
  };
}
