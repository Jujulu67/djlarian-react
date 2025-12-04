import { selectPreferredPlatform } from '../platformSelector';
import { Track, MusicPlatform } from '../types';

describe('platformSelector', () => {
  describe('selectPreferredPlatform', () => {
    it('should return YouTube if available', () => {
      const track: Track = {
        id: 'track-1',
        name: 'Test Track',
        platforms: {
          youtube: { url: 'https://youtube.com/watch?v=123' },
          soundcloud: { url: 'https://soundcloud.com/track' },
        },
      } as Track;

      const result = selectPreferredPlatform(track);

      expect(result).toBe('youtube');
    });

    it('should return SoundCloud if YouTube not available', () => {
      const track: Track = {
        id: 'track-2',
        name: 'Test Track',
        platforms: {
          soundcloud: { url: 'https://soundcloud.com/track' },
        },
      } as Track;

      const result = selectPreferredPlatform(track);

      expect(result).toBe('soundcloud');
    });

    it('should return null if no platforms available', () => {
      const track: Track = {
        id: 'track-3',
        name: 'Test Track',
        platforms: {},
      } as Track;

      const result = selectPreferredPlatform(track);

      expect(result).toBeNull();
    });

    it('should return null if platforms is undefined', () => {
      const track: Track = {
        id: 'track-4',
        name: 'Test Track',
      } as Track;

      const result = selectPreferredPlatform(track);

      expect(result).toBeNull();
    });

    it('should return null if platform URL is empty', () => {
      const track: Track = {
        id: 'track-5',
        name: 'Test Track',
        platforms: {
          youtube: { url: '' },
          soundcloud: { url: '' },
        },
      } as Track;

      const result = selectPreferredPlatform(track);

      expect(result).toBeNull();
    });

    it('should prioritize YouTube over SoundCloud', () => {
      const track: Track = {
        id: 'track-6',
        name: 'Test Track',
        platforms: {
          soundcloud: { url: 'https://soundcloud.com/track' },
          youtube: { url: 'https://youtube.com/watch?v=123' },
        },
      } as Track;

      const result = selectPreferredPlatform(track);

      expect(result).toBe('youtube');
    });
  });
});
