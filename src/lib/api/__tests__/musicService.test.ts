/**
 * Tests for musicService
 * @jest-environment node
 */
import { getAllTracks, getTrackById, createTrack } from '../musicService';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    track: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    genre: {
      upsert: jest.fn(),
    },
    trackPlatform: {
      createMany: jest.fn(),
    },
    genresOnTracks: {
      createMany: jest.fn(),
    },
  },
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

describe('musicService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllTracks', () => {
    it('should return all tracks', async () => {
      const { default: prisma } = await import('@/lib/prisma');
      const mockTracks = [
        {
          id: '1',
          title: 'Track 1',
          artist: 'Artist 1',
        },
      ];

      (prisma.track.findMany as jest.Mock).mockResolvedValue(mockTracks);

      const result = await getAllTracks();

      expect(result).toEqual(mockTracks);
      expect(prisma.track.findMany).toHaveBeenCalledWith({
        include: {
          TrackPlatform: true,
          GenresOnTracks: {
            include: {
              Genre: true,
            },
          },
          MusicCollection: true,
          User: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [{ featured: 'desc' }, { releaseDate: 'desc' }],
      });
    });
  });

  describe('getTrackById', () => {
    it('should return track by id', async () => {
      const { default: prisma } = await import('@/lib/prisma');
      const mockTrack = {
        id: '1',
        title: 'Track 1',
        artist: 'Artist 1',
      };

      (prisma.track.findUnique as jest.Mock).mockResolvedValue(mockTrack);

      const result = await getTrackById('1');

      expect(result).toEqual(mockTrack);
      expect(prisma.track.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: {
          TrackPlatform: true,
          GenresOnTracks: {
            include: {
              Genre: true,
            },
          },
          MusicCollection: true,
          User: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    });
  });

  describe('createTrack', () => {
    it('should create track with genres and platforms', async () => {
      const { default: prisma } = await import('@/lib/prisma');
      const mockGenre = { id: 'genre-1', name: 'electronic' };
      const mockTrack = {
        id: 'track-1',
        title: 'New Track',
        artist: 'Artist',
      };

      (prisma.genre.upsert as jest.Mock).mockResolvedValue(mockGenre);
      (prisma.track.create as jest.Mock).mockResolvedValue(mockTrack);
      (prisma.trackPlatform.createMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.genresOnTracks.createMany as jest.Mock).mockResolvedValue({ count: 1 });

      const input = {
        title: 'New Track',
        artist: 'Artist',
        releaseDate: '2024-01-01',
        type: 'single' as const,
        genreNames: ['Electronic'],
        platforms: [
          {
            platform: 'spotify' as const,
            url: 'https://spotify.com/track/1',
          },
        ],
      };

      const result = await createTrack(input, 'user-1');

      expect(result).toEqual(mockTrack);
      expect(prisma.genre.upsert).toHaveBeenCalled();
      expect(prisma.track.create).toHaveBeenCalled();
    });
  });
});
