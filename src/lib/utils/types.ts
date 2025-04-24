export interface NavItem {
  title: string;
  href: string;
  isExternal?: boolean;
}

export interface SocialLink {
  platform: string;
  url: string;
  icon: string;
}

export type MusicPlatform = 'spotify' | 'youtube' | 'soundcloud' | 'apple' | 'deezer';

export type MusicType = 'single' | 'ep' | 'album' | 'remix' | 'live' | 'djset' | 'video';

export interface Track {
  id: string;
  title: string;
  artist: string;
  imageId?: string;
  audioUrl?: string;
  duration?: number;
  releaseDate: string;
  genre: string[];
  description?: string;
  bpm?: number;
  featured?: boolean;
  isPublished?: boolean;
  type: MusicType;
  collection?: { id: string; title: string } | null;
  user?: { id: string; name: string | null } | null;
  trackId?: string;
  platforms: {
    [key in MusicPlatform]?: {
      url: string;
      embedId?: string;
    };
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  imageId?: string | null;
  ticketUrl?: string;
  isFeatured?: boolean;
}

export interface GalleryItem {
  id: string;
  title: string;
  imageUrl: string;
  type: 'image' | 'video';
  date: string;
  description?: string;
}
