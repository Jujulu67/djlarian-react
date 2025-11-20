import type { Track } from '@/lib/utils/types';

export function getTrackStatus(track: Track): { label: string; className: string } {
  const now = new Date();
  if (track.publishAt && new Date(track.publishAt) > now) {
    return {
      label: `À publier le ${new Date(track.publishAt).toLocaleDateString()}`,
      className: 'bg-blue-900/40 text-blue-300',
    };
  }
  if (track.isPublished && (!track.publishAt || new Date(track.publishAt) <= now)) {
    return { label: 'Publié', className: 'bg-green-900/40 text-green-300' };
  }
  return { label: 'Brouillon', className: 'bg-yellow-900/40 text-yellow-300' };
}
