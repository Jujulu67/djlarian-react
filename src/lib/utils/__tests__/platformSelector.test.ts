import { selectPreferredPlatform } from '../platformSelector';
import { Track, MusicPlatform } from '../types';

describe('selectPreferredPlatform', () => {
  it('should return null when track has no platforms', () => {
    const track = { platforms: undefined } as Track;
    expect(selectPreferredPlatform(track)).toBeNull();
  });

  it('should return null when platforms object is empty', () => {
    const track = { platforms: {} } as Track;
    expect(selectPreferredPlatform(track)).toBeNull();
  });

  it('should prefer YouTube over SoundCloud', () => {
    const track = {
      platforms: {
        youtube: { url: 'https://youtube.com/watch?v=123' },
        soundcloud: { url: 'https://soundcloud.com/track/123' },
      },
    } as Track;
    expect(selectPreferredPlatform(track)).toBe('youtube');
  });

  it('should return SoundCloud when YouTube is not available', () => {
    const track = {
      platforms: {
        soundcloud: { url: 'https://soundcloud.com/track/123' },
      },
    } as Track;
    expect(selectPreferredPlatform(track)).toBe('soundcloud');
  });

  it('should return YouTube when only YouTube is available', () => {
    const track = {
      platforms: {
        youtube: { url: 'https://youtube.com/watch?v=123' },
      },
    } as Track;
    expect(selectPreferredPlatform(track)).toBe('youtube');
  });

  it('should return null when platforms have no URLs', () => {
    const track = {
      platforms: {
        youtube: { url: '' },
        soundcloud: { url: '' },
      },
    } as Track;
    expect(selectPreferredPlatform(track)).toBeNull();
  });

  it('should return null when platform objects exist but url is undefined', () => {
    const track = {
      platforms: {
        youtube: {},
        soundcloud: {},
      },
    } as Track;
    expect(selectPreferredPlatform(track)).toBeNull();
  });

  it('should handle partial platform data', () => {
    const track = {
      platforms: {
        youtube: { url: '' },
        soundcloud: { url: 'https://soundcloud.com/track/123' },
      },
    } as Track;
    expect(selectPreferredPlatform(track)).toBe('soundcloud');
  });

  it('should return the first available platform in priority order', () => {
    const track = {
      platforms: {
        soundcloud: { url: 'https://soundcloud.com/track/123' },
        youtube: { url: 'https://youtube.com/watch?v=456' },
      },
    } as Track;
    // YouTube should still be preferred even if soundcloud is listed first
    expect(selectPreferredPlatform(track)).toBe('youtube');
  });
});
