import { describe, it, expect, beforeEach, jest } from '@jest/globals';

import * as spotifyService from '../spotify';

// Mock fetch
global.fetch = jest.fn();

describe('Spotify Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Note: Le cache est géré en interne, pas besoin de le réinitialiser explicitement
  });

  describe('getSpotifyToken', () => {
    it('should return a token when credentials are valid', async () => {
      const mockTokenResponse = {
        access_token: 'test_token',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      });

      process.env.SPOTIFY_CLIENT_ID = 'test_client_id';
      process.env.SPOTIFY_CLIENT_SECRET = 'test_client_secret';

      const token = await spotifyService.getSpotifyToken();

      expect(token).toBe('test_token');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://accounts.spotify.com/api/token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        })
      );
    });

    it('should throw error when credentials are missing', async () => {
      delete process.env.SPOTIFY_CLIENT_ID;
      delete process.env.SPOTIFY_CLIENT_SECRET;

      await expect(spotifyService.getSpotifyToken()).rejects.toThrow(
        'SPOTIFY_CLIENT_ID et SPOTIFY_CLIENT_SECRET doivent être configurés'
      );
    });
  });

  describe('searchArtist', () => {
    it('should return artist when found', async () => {
      const mockArtist = {
        id: 'artist123',
        name: 'Larian',
        external_urls: { spotify: 'https://spotify.com/artist/123' },
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            artists: {
              items: [mockArtist],
              total: 1,
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'token',
            token_type: 'Bearer',
            expires_in: 3600,
          }),
        });

      process.env.SPOTIFY_CLIENT_ID = 'test_id';
      process.env.SPOTIFY_CLIENT_SECRET = 'test_secret';

      const artist = await spotifyService.searchArtist('Larian');

      expect(artist).toEqual(mockArtist);
    });

    it('should return null when artist not found', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            artists: { items: [], total: 0 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'token',
            token_type: 'Bearer',
            expires_in: 3600,
          }),
        });

      process.env.SPOTIFY_CLIENT_ID = 'test_id';
      process.env.SPOTIFY_CLIENT_SECRET = 'test_secret';

      const artist = await spotifyService.searchArtist('UnknownArtist');

      expect(artist).toBeNull();
    });
  });

  describe('mapSpotifyAlbumTypeToTrackType', () => {
    it('should map single to single', () => {
      expect(spotifyService.mapSpotifyAlbumTypeToTrackType('single', false)).toBe('single');
    });

    it('should map album to album', () => {
      expect(spotifyService.mapSpotifyAlbumTypeToTrackType('album', false)).toBe('album');
    });

    it('should map compilation to ep', () => {
      expect(spotifyService.mapSpotifyAlbumTypeToTrackType('compilation', false)).toBe('ep');
    });
  });
});
