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
  imageId?: string | null;
  audioUrl?: string;
  duration?: number;
  releaseDate: string;
  genre: string[];
  description?: string;
  bpm?: number;
  musicalKey?: string;
  featured?: boolean;
  isPublished?: boolean;
  publishAt?: string;
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

/*
// NOTE: Cette définition manuelle de Event est obsolète.
// Il est préférable d'utiliser le type Event généré par Prisma Client.
// import { Event } from '@prisma/client';
export interface Event {
  id: string;
  title: string;
  date: string; // Doit être startDate (DateTime)
  location: string;
  description: string;
  imageId?: string | null;
  ticketUrl?: string; // Doit être via TicketInfo relation
  isFeatured?: boolean; // Doit être featured (Boolean)
}
*/

export interface GalleryItem {
  id: string;
  title: string;
  imageUrl: string;
  type: 'image' | 'video';
  date: string;
  description?: string;
}
