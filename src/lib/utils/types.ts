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

export interface Track {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  audioUrl: string;
  duration: number;
  releaseDate: string;
  genre: string[];
}

export interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  imageUrl: string;
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
