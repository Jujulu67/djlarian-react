import type { ImageMeta } from '@/app/api/admin/images/shared';

export type LinkedTo = { type: 'track' | 'event'; id: string; title: string } | null;

export type GroupedImage = {
  imageId: string;
  crop: ImageMeta | null;
  ori: ImageMeta | null;
  linkedTo: LinkedTo;
};

export type SortOption =
  | 'date-desc'
  | 'date-asc'
  | 'name-asc'
  | 'name-desc'
  | 'size-asc'
  | 'size-desc'
  | 'type'
  | 'linked';

