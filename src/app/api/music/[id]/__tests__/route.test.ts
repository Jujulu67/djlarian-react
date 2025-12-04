/**
 * Tests for /api/music/[id] route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { GET, PUT } from '../route';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => {
  const mockPrisma: any = {
    track: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    genre: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    trackPlatform: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    genresOnTracks: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  };
  mockPrisma.$transaction = jest.fn((callback: any) => callback(mockPrisma));
  return {
    __esModule: true,
    default: mockPrisma,
  };
});

jest.mock('@/lib/api/musicService', () => ({
  formatTrackData: jest.fn((track) => track),
  UpdateTrackInput: {},
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('/api/music/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return track for valid ID', async () => {
      const { default: mockPrisma } = await import('@/lib/prisma');
      (mockPrisma.track.findUnique as jest.Mock).mockResolvedValue({
        id: 'track-1',
        title: 'Test Track',
        artist: 'Test Artist',
        TrackPlatform: [],
        GenresOnTracks: [],
        MusicCollection: null,
        User: { id: 'user-1', name: 'User' },
      });

      const request = new NextRequest('http://localhost/api/music/track-1');
      const response = await GET(request, { params: Promise.resolve({ id: 'track-1' }) });

      expect(response.status).toBe(200);
    });

    it('should return 404 for non-existent track', async () => {
      const { default: mockPrisma } = await import('@/lib/prisma');
      (mockPrisma.track.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/music/invalid');
      const response = await GET(request, { params: Promise.resolve({ id: 'invalid' }) });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('PUT', () => {
    it('should update track for admin user', async () => {
      const { auth } = await import('@/auth');
      const { default: mockPrisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
      });

      (mockPrisma.track.findUnique as jest.Mock).mockResolvedValue({
        id: 'track-1',
      });

      (mockPrisma.track.update as jest.Mock).mockResolvedValue({
        id: 'track-1',
        title: 'Updated Track',
      });

      (mockPrisma.genre.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.trackPlatform.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (mockPrisma.genresOnTracks.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

      const request = new NextRequest('http://localhost/api/music/track-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Track' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: 'track-1' }) });

      expect(response.status).toBe(200);
    });

    it('should return 401 for non-admin user', async () => {
      const { auth } = await import('@/auth');
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user1', role: 'USER' },
      });

      const request = new NextRequest('http://localhost/api/music/track-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Track' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: 'track-1' }) });

      expect(response.status).toBe(401);
    });
  });
});
