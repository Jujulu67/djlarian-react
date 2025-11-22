import { describe, it, expect, beforeEach, jest } from '@jest/globals';

import * as lastfmService from '../lastfm';

// Mock fetch
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('Last.fm Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTrackTags', () => {
    it('should return tags when API key is configured', async () => {
      // Le service lit process.env.LASTFM_API_KEY au moment de l'import
      // On doit mocker la variable d'environnement avant l'import
      // Pour ce test, on va directement mocker le comportement
      const originalEnv = process.env.LASTFM_API_KEY;
      process.env.LASTFM_API_KEY = 'test_api_key';

      const mockResponse = {
        track: {
          name: 'Test Track',
          artist: { name: 'Larian' },
          tags: {
            tag: [
              { name: 'Electronic', url: 'http://last.fm/tag/electronic' },
              { name: 'House', url: 'http://last.fm/tag/house' },
            ],
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      // Re-import pour que le module lise la nouvelle valeur de LASTFM_API_KEY
      jest.resetModules();
      const lastfmServiceReloaded = await import('../lastfm');
      const tags = await lastfmServiceReloaded.getTrackTags('Larian', 'Test Track');

      expect(tags).toEqual(['Electronic', 'House']);

      // Restore
      process.env.LASTFM_API_KEY = originalEnv;
      jest.resetModules();
    });

    it('should return empty array when API key is not configured', async () => {
      delete process.env.LASTFM_API_KEY;

      const tags = await lastfmService.getTrackTags('Larian', 'Test Track');

      expect(tags).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return empty array when track has no tags', async () => {
      process.env.LASTFM_API_KEY = 'test_api_key';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          track: {
            name: 'Test Track',
            artist: { name: 'Larian' },
          },
        }),
      });

      const tags = await lastfmService.getTrackTags('Larian', 'Test Track');

      expect(tags).toEqual([]);
    });
  });

  describe('getTrackInfo', () => {
    it('should return track info with description', async () => {
      const originalEnv = process.env.LASTFM_API_KEY;

      // Définir la clé API AVANT resetModules
      process.env.LASTFM_API_KEY = 'test_api_key';

      // Re-import pour que le module lise la nouvelle valeur de LASTFM_API_KEY
      jest.resetModules();
      const lastfmServiceReloaded = await import('../lastfm');

      const mockResponse = {
        track: {
          name: 'Test Track',
          artist: { name: 'Larian' },
          tags: {
            tag: [{ name: 'Electronic', url: 'http://last.fm/tag/electronic' }],
          },
          wiki: {
            summary: 'A great track',
            content: 'Full description',
          },
          duration: '240000',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const info = await lastfmServiceReloaded.getTrackInfo('Larian', 'Test Track');

      expect(info).not.toBeNull();
      expect(info).toMatchObject({
        tags: ['Electronic'],
        description: 'A great track',
        duration: 240000,
      });

      // Restore
      process.env.LASTFM_API_KEY = originalEnv;
      jest.resetModules();
    });

    it('should return null when API key is not configured', async () => {
      delete process.env.LASTFM_API_KEY;

      const info = await lastfmService.getTrackInfo('Larian', 'Test Track');

      expect(info).toBeNull();
    });
  });
});
