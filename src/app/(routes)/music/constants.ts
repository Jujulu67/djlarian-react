import { MusicType } from '@/lib/utils/types';

// Types de musique disponibles
export const MUSIC_TYPES: { label: string; value: MusicType | 'all' }[] = [
  { label: 'Tous', value: 'all' },
  { label: 'Singles', value: 'single' },
  { label: 'EPs & Albums', value: 'ep' },
  { label: 'Remixes', value: 'remix' },
  { label: 'DJ Sets', value: 'djset' },
  { label: 'Live', value: 'live' },
];

export const getMusicTypeLabel = (type: MusicType | 'all'): string | undefined =>
  MUSIC_TYPES.find((t) => t.value === type)?.label;
