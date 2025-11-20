import { getTrackStatus } from '../getTrackStatus';
import type { Track } from '@/lib/utils/types';

describe('getTrackStatus', () => {
  it('should return "À publier" for future publishAt date', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // 7 days from now

    const track: Track = {
      id: '1',
      title: 'Test',
      artist: 'Artist',
      releaseDate: new Date().toISOString(),
      type: 'single',
      isPublished: false,
      publishAt: futureDate.toISOString(),
      platforms: {},
      genre: [],
    };

    const status = getTrackStatus(track);
    expect(status.label).toContain('À publier');
    expect(status.className).toContain('bg-blue-900/40');
  });

  it('should return "Publié" for published track with past or no publishAt', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 7); // 7 days ago

    const track: Track = {
      id: '1',
      title: 'Test',
      artist: 'Artist',
      releaseDate: new Date().toISOString(),
      type: 'single',
      isPublished: true,
      publishAt: pastDate.toISOString(),
      platforms: {},
      genre: [],
    };

    const status = getTrackStatus(track);
    expect(status.label).toBe('Publié');
    expect(status.className).toContain('bg-green-900/40');
  });

  it('should return "Brouillon" for unpublished track', () => {
    const track: Track = {
      id: '1',
      title: 'Test',
      artist: 'Artist',
      releaseDate: new Date().toISOString(),
      type: 'single',
      isPublished: false,
      platforms: {},
      genre: [],
    };

    const status = getTrackStatus(track);
    expect(status.label).toBe('Brouillon');
    expect(status.className).toContain('bg-yellow-900/40');
  });
});

