/**
 * Tests for lib/data/music
 */

// Mock dependencies BEFORE imports - IMPORTANT: Mock in order to avoid circular dependencies
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    track: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock musicService AFTER prisma and logger to avoid circular deps
const mockFormatTrackData = jest.fn((track: any) => {
  if (!track) return null;
  return {
    id: track.id,
    title: track.title,
    type: 'single',
    releaseDate: track.releaseDate?.toISOString() || '2024-01-10',
  };
});

jest.mock('@/lib/api/musicService', () => ({
  formatTrackData: mockFormatTrackData,
}));

import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';

// Import the function to test - this will use the mocked formatTrackData
import { getLatestReleases } from '../music';

describe('getLatestReleases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFormatTrackData.mockClear();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T10:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const mockTrack = {
    id: '1',
    title: 'Track 1',
    releaseDate: new Date('2024-01-10T10:00:00Z'),
    featured: false,
    isPublished: true,
    publishAt: null,
    TrackPlatform: [],
    GenresOnTracks: [],
    MusicCollection: null,
    User: { id: 'user1', name: 'Artist 1' },
  };

  it('should return latest releases filtered by type', async () => {
    const mockTracks = [
      { ...mockTrack, id: '1', title: 'Single 1' },
      { ...mockTrack, id: '2', title: 'EP 1' },
      { ...mockTrack, id: '3', title: 'Album 1' },
    ];

    (prisma.track.findMany as jest.Mock).mockResolvedValue(mockTracks);
    mockFormatTrackData
      .mockReturnValueOnce({ type: 'single', releaseDate: '2024-01-10' })
      .mockReturnValueOnce({ type: 'ep', releaseDate: '2024-01-09' })
      .mockReturnValueOnce({ type: 'album', releaseDate: '2024-01-08' });

    const result = await getLatestReleases(3);

    expect(result).toHaveLength(3);
    expect(result[0].type).toBe('single');
    expect(prisma.track.findMany).toHaveBeenCalled();
  });

  it('should filter out non-release types (dj-set, video)', async () => {
    const mockTracks = [
      { ...mockTrack, id: '1', title: 'Single 1' },
      { ...mockTrack, id: '2', title: 'DJ Set 1' },
      { ...mockTrack, id: '3', title: 'Video 1' },
    ];

    (prisma.track.findMany as jest.Mock).mockResolvedValue(mockTracks);
    mockFormatTrackData
      .mockReturnValueOnce({ type: 'single', releaseDate: '2024-01-10' })
      .mockReturnValueOnce({ type: 'dj-set', releaseDate: '2024-01-09' })
      .mockReturnValueOnce({ type: 'video', releaseDate: '2024-01-08' });

    const result = await getLatestReleases(3);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('single');
  });

  it('should sort releases by release date (newest first)', async () => {
    const mockTracks = [
      { ...mockTrack, id: '1', title: 'Track 1', releaseDate: new Date('2024-01-05T10:00:00Z') },
      { ...mockTrack, id: '2', title: 'Track 2', releaseDate: new Date('2024-01-10T10:00:00Z') },
      { ...mockTrack, id: '3', title: 'Track 3', releaseDate: new Date('2024-01-08T10:00:00Z') },
    ];

    (prisma.track.findMany as jest.Mock).mockResolvedValue(mockTracks);
    mockFormatTrackData
      .mockReturnValueOnce({ type: 'single', releaseDate: '2024-01-05' })
      .mockReturnValueOnce({ type: 'single', releaseDate: '2024-01-10' })
      .mockReturnValueOnce({ type: 'single', releaseDate: '2024-01-08' });

    const result = await getLatestReleases(3);

    expect(result[0].releaseDate).toBe('2024-01-10');
    expect(result[1].releaseDate).toBe('2024-01-08');
    expect(result[2].releaseDate).toBe('2024-01-05');
  });

  it('should respect the count limit', async () => {
    const mockTracks = Array.from({ length: 10 }, (_, i) => ({
      ...mockTrack,
      id: String(i + 1),
      title: `Track ${i + 1}`,
    }));

    (prisma.track.findMany as jest.Mock).mockResolvedValue(mockTracks);
    mockFormatTrackData.mockImplementation((track) => ({
      type: 'single',
      releaseDate: '2024-01-10',
    }));

    const result = await getLatestReleases(3);

    expect(result).toHaveLength(3);
  });

  it('should auto-publish tracks when publishAt date is reached', async () => {
    const mockTracks = [
      {
        ...mockTrack,
        id: '1',
        isPublished: false,
        publishAt: new Date('2024-01-14T10:00:00Z'), // Past date
      },
    ];

    (prisma.track.findMany as jest.Mock).mockResolvedValue(mockTracks);
    (prisma.track.update as jest.Mock).mockResolvedValue({
      ...mockTracks[0],
      isPublished: true,
    });
    mockFormatTrackData.mockReturnValue({
      type: 'single',
      releaseDate: '2024-01-10',
    });

    await getLatestReleases(3);

    expect(prisma.track.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { isPublished: true },
    });
  });

  it('should not auto-publish tracks when publishAt is in the future', async () => {
    const mockTracks = [
      {
        ...mockTrack,
        id: '1',
        isPublished: false,
        publishAt: new Date('2024-01-16T10:00:00Z'), // Future date
      },
    ];

    (prisma.track.findMany as jest.Mock).mockResolvedValue(mockTracks);
    mockFormatTrackData.mockReturnValue({
      type: 'single',
      releaseDate: '2024-01-10',
    });

    await getLatestReleases(3);

    expect(prisma.track.update).not.toHaveBeenCalled();
  });

  it('should handle update errors gracefully', async () => {
    const mockTracks = [
      {
        ...mockTrack,
        id: '1',
        isPublished: false,
        publishAt: new Date('2024-01-14T10:00:00Z'),
      },
    ];

    (prisma.track.findMany as jest.Mock).mockResolvedValue(mockTracks);
    (prisma.track.update as jest.Mock).mockRejectedValue(new Error('Update error'));
    mockFormatTrackData.mockReturnValue({
      type: 'single',
      releaseDate: '2024-01-10',
    });

    const result = await getLatestReleases(3);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Erreur lors de la mise à jour'),
      expect.any(Error)
    );
    expect(result).toHaveLength(1);
  });

  it('should filter out null tracks from formatTrackData', async () => {
    const mockTracks = [
      { ...mockTrack, id: '1' },
      { ...mockTrack, id: '2' },
    ];

    (prisma.track.findMany as jest.Mock).mockResolvedValue(mockTracks);
    mockFormatTrackData
      .mockReturnValueOnce({ type: 'single', releaseDate: '2024-01-10' })
      .mockReturnValueOnce(null); // Second track is null

    const result = await getLatestReleases(3);

    expect(result).toHaveLength(1);
  });

  it('should handle errors gracefully', async () => {
    (prisma.track.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

    const result = await getLatestReleases(3);

    expect(result).toEqual([]);
    expect(logger.error).toHaveBeenCalledWith(
      '[DATA MUSIC] Erreur dans getLatestReleases:',
      expect.any(Error)
    );
  });

  it('should include remix type in releases', async () => {
    const mockTracks = [{ ...mockTrack, id: '1' }];

    (prisma.track.findMany as jest.Mock).mockResolvedValue(mockTracks);
    mockFormatTrackData.mockReturnValue({
      type: 'remix',
      releaseDate: '2024-01-10',
    });

    const result = await getLatestReleases(3);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('remix');
  });

  it('should order by featured first, then releaseDate', async () => {
    const mockTracks = [
      { ...mockTrack, id: '1', featured: false, releaseDate: new Date('2024-01-10T10:00:00Z') },
      { ...mockTrack, id: '2', featured: true, releaseDate: new Date('2024-01-05T10:00:00Z') },
    ];

    (prisma.track.findMany as jest.Mock).mockResolvedValue(mockTracks);
    mockFormatTrackData
      .mockReturnValueOnce({ type: 'single', releaseDate: '2024-01-10' })
      .mockReturnValueOnce({ type: 'single', releaseDate: '2024-01-05' });

    await getLatestReleases(3);

    expect(prisma.track.findMany).toHaveBeenCalledWith({
      include: expect.any(Object),
      orderBy: [{ featured: 'desc' }, { releaseDate: 'desc' }],
    });
  });
});
