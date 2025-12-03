/**
 * Tests for music-service utilities
 */
import { extractPlatformId, getEmbedUrl, getYouTubeThumbnail } from '../music-service';

describe('extractPlatformId', () => {
  it('should extract Spotify track ID', () => {
    const url = 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT';
    const id = extractPlatformId(url, 'spotify');
    expect(id).toBe('4cOdK2wGLETKBW3PvgPWqT');
  });

  it('should extract Spotify album ID', () => {
    const url = 'https://open.spotify.com/album/123456';
    const id = extractPlatformId(url, 'spotify');
    expect(id).toBe('123456');
  });

  it('should extract YouTube video ID', () => {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const id = extractPlatformId(url, 'youtube');
    expect(id).toBe('dQw4w9WgXcQ');
  });

  it('should extract YouTube short URL ID', () => {
    const url = 'https://youtu.be/dQw4w9WgXcQ';
    const id = extractPlatformId(url, 'youtube');
    expect(id).toBe('dQw4w9WgXcQ');
  });

  it('should extract SoundCloud ID', () => {
    const url = 'https://soundcloud.com/user/track-name';
    const id = extractPlatformId(url, 'soundcloud');
    expect(id).toBe('user/track-name');
  });

  it('should return null for invalid URL', () => {
    const url = 'https://example.com';
    const id = extractPlatformId(url, 'spotify');
    expect(id).toBeNull();
  });
});

describe('getEmbedUrl', () => {
  it('should generate Spotify embed URL', () => {
    const url = 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT';
    const embedUrl = getEmbedUrl(url, 'spotify');
    expect(embedUrl).toContain('open.spotify.com/embed');
    expect(embedUrl).toContain('4cOdK2wGLETKBW3PvgPWqT');
  });

  it('should generate YouTube embed URL', () => {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const embedUrl = getEmbedUrl(url, 'youtube');
    expect(embedUrl).toContain('youtube.com/embed');
    expect(embedUrl).toContain('dQw4w9WgXcQ');
  });

  it('should generate SoundCloud embed URL', () => {
    const url = 'https://soundcloud.com/user/track-name';
    const embedUrl = getEmbedUrl(url, 'soundcloud');
    expect(embedUrl).toContain('soundcloud.com');
  });

  it('should return null for invalid URL', () => {
    const url = 'https://example.com';
    const embedUrl = getEmbedUrl(url, 'spotify');
    expect(embedUrl).toBeNull();
  });
});

describe('getYouTubeThumbnail', () => {
  it('should generate YouTube thumbnail URL', () => {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const thumbnail = getYouTubeThumbnail(url);
    expect(thumbnail).toContain('img.youtube.com');
    expect(thumbnail).toContain('dQw4w9WgXcQ');
    expect(thumbnail).toContain('hqdefault.jpg');
  });

  it('should return null for invalid URL', () => {
    const url = 'https://example.com';
    const thumbnail = getYouTubeThumbnail(url);
    expect(thumbnail).toBeNull();
  });
});
