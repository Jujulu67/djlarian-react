import {
  extractPlatformId,
  getEmbedUrl,
  getYouTubeThumbnail,
  getDemoTracks,
} from '../music-service';
import { MusicPlatform } from '../types';

describe('music-service', () => {
  describe('extractPlatformId', () => {
    it('should extract Spotify track ID', () => {
      const result = extractPlatformId(
        'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
        'spotify'
      );

      expect(result).toBe('4cOdK2wGLETKBW3PvgPWqT');
    });

    it('should extract Spotify album ID', () => {
      const result = extractPlatformId(
        'https://open.spotify.com/album/1ATL5GLyefJaxhQzSPVrLX',
        'spotify'
      );

      expect(result).toBe('1ATL5GLyefJaxhQzSPVrLX');
    });

    it('should extract YouTube video ID from watch URL', () => {
      const result = extractPlatformId('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube');

      expect(result).toBe('dQw4w9WgXcQ');
    });

    it('should extract YouTube video ID from short URL', () => {
      const result = extractPlatformId('https://youtu.be/dQw4w9WgXcQ', 'youtube');

      expect(result).toBe('dQw4w9WgXcQ');
    });

    it('should extract SoundCloud track ID', () => {
      const result = extractPlatformId('https://soundcloud.com/artist/track-name', 'soundcloud');

      expect(result).toBe('artist/track-name');
    });

    it('should return null for invalid Spotify URL', () => {
      const result = extractPlatformId('https://example.com', 'spotify');

      expect(result).toBeNull();
    });

    it('should return null for invalid YouTube URL', () => {
      const result = extractPlatformId('https://example.com', 'youtube');

      expect(result).toBeNull();
    });

    it('should return null for invalid SoundCloud URL', () => {
      const result = extractPlatformId('https://example.com', 'soundcloud');

      expect(result).toBeNull();
    });
  });

  describe('getEmbedUrl', () => {
    it('should generate Spotify embed URL', () => {
      const result = getEmbedUrl(
        'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
        'spotify'
      );

      expect(result).toBe('https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT');
    });

    it('should generate YouTube embed URL', () => {
      const result = getEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube');

      expect(result).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
    });

    it('should generate SoundCloud embed URL', () => {
      const result = getEmbedUrl('https://soundcloud.com/artist/track-name', 'soundcloud');

      expect(result).toContain('soundcloud.com');
      expect(result).toContain('artist/track-name');
    });

    it('should return null for invalid URL', () => {
      const result = getEmbedUrl('https://example.com', 'spotify');

      expect(result).toBeNull();
    });
  });

  describe('getYouTubeThumbnail', () => {
    it('should generate YouTube thumbnail URL', () => {
      const result = getYouTubeThumbnail('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

      expect(result).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
    });

    it('should return null for invalid YouTube URL', () => {
      const result = getYouTubeThumbnail('https://example.com');

      expect(result).toBeNull();
    });
  });

  describe('getDemoTracks', () => {
    it('should return array of demo tracks', () => {
      const tracks = getDemoTracks();

      expect(Array.isArray(tracks)).toBe(true);
      expect(tracks.length).toBeGreaterThan(0);
    });

    it('should return tracks with required fields', () => {
      const tracks = getDemoTracks();

      tracks.forEach((track) => {
        expect(track.id).toBeDefined();
        expect(track.title).toBeDefined();
        expect(track.artist).toBeDefined();
      });
    });

    it('should return exactly 11 tracks', () => {
      const tracks = getDemoTracks();
      expect(tracks.length).toBe(11);
    });

    it('should have tracks with various types', () => {
      const tracks = getDemoTracks();
      const types = tracks.map((t) => t.type);
      expect(types).toContain('single');
      expect(types).toContain('ep');
      expect(types).toContain('live');
      expect(types).toContain('remix');
      expect(types).toContain('djset');
    });
  });

  describe('extractPlatformId edge cases', () => {
    it('should handle Spotify playlist URLs', () => {
      const result = extractPlatformId(
        'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
        'spotify'
      );
      expect(result).toBe('37i9dQZF1DXcBWIGoYBM5M');
    });

    it('should handle unknown platform', () => {
      const result = extractPlatformId('https://example.com', 'apple' as MusicPlatform);
      expect(result).toBeNull();
    });

    it('should handle empty string', () => {
      const result = extractPlatformId('', 'spotify');
      expect(result).toBeNull();
    });

    it('should handle SoundCloud URLs with special characters', () => {
      const result = extractPlatformId(
        'https://soundcloud.com/user-name/track-name-123',
        'soundcloud'
      );
      expect(result).toBe('user-name/track-name-123');
    });
  });

  describe('getEmbedUrl edge cases', () => {
    it('should handle unknown platform', () => {
      const result = getEmbedUrl('https://example.com', 'apple' as MusicPlatform);
      expect(result).toBeNull();
    });

    it('should return null when extractPlatformId returns null', () => {
      const result = getEmbedUrl('invalid-url', 'spotify');
      expect(result).toBeNull();
    });
  });

  describe('getYouTubeThumbnail edge cases', () => {
    it('should handle youtu.be short URLs', () => {
      const result = getYouTubeThumbnail('https://youtu.be/dQw4w9WgXcQ');
      expect(result).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
    });

    it('should handle empty string', () => {
      const result = getYouTubeThumbnail('');
      expect(result).toBeNull();
    });
  });
});
