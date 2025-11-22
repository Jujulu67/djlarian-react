import { describe, it, expect, beforeEach, jest } from '@jest/globals';

import * as musicbrainzService from '../musicbrainz';

// Mock fetch
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('MusicBrainz Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MUSICBRAINZ_USER_AGENT = 'TestApp/1.0.0 (test@example.com)';
  });

  describe('searchRelease', () => {
    it('should return release when found', async () => {
      const mockRelease = {
        id: 'release123',
        title: 'Test Album',
        date: '2024-01-01',
        'release-group': {
          'primary-type': 'Album',
          'first-release-date': '2024-01-01',
        },
        'tag-list': [{ name: 'Electronic', count: 10 }],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          releases: [mockRelease],
          count: 1,
        }),
      });

      const release = await musicbrainzService.searchRelease('Larian', 'Test Album');

      expect(release).toEqual(mockRelease);
      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toContain('musicbrainz.org');
      expect(callArgs[1]).toMatchObject({
        headers: expect.objectContaining({
          'User-Agent': expect.any(String),
          Accept: 'application/json',
        }),
      });
    });

    it('should return null when release not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          releases: [],
          count: 0,
        }),
      });

      const release = await musicbrainzService.searchRelease('Unknown', 'Unknown');

      expect(release).toBeNull();
    });
  });

  describe('enrichTrackData', () => {
    it('should enrich track data with genres and tags', async () => {
      const mockRelease = {
        id: 'release123',
        title: 'Test Album',
        date: '2024-01-01',
        'release-group': {
          'primary-type': 'Album',
          'first-release-date': '2024-01-01',
        },
        'tag-list': [
          { name: 'Electronic', count: 10 },
          { name: 'House', count: 5 },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          releases: [mockRelease],
          count: 1,
        }),
      });

      const enriched = await musicbrainzService.enrichTrackData('Larian', 'Test Album');

      expect(enriched.genres).toEqual(['Electronic', 'House']);
      expect(enriched.releaseDate).toBe('2024-01-01');
    });

    it('should return empty object when release not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          releases: [],
          count: 0,
        }),
      });

      const enriched = await musicbrainzService.enrichTrackData('Unknown', 'Unknown');

      expect(enriched).toEqual({});
    });
  });
});
