export type Theme = 'light' | 'dark';

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: 'USER' | 'ADMIN';
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number;
  coverUrl?: string;
  originalImageUrl?: string;
  audioUrl: string;
  genre?: string;
  bpm?: number;
  key?: string;
  releaseDate: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  imageUrl?: string;
  ticketUrl?: string;
  isVirtual: boolean;
}

export interface StreamInfo {
  isLive: boolean;
  viewerCount: number;
  startedAt?: string;
  title?: string;
  thumbnailUrl?: string;
}

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}
