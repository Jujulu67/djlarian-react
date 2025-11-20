/**
 * Tests for /api/music route
 * Note: These are integration tests that may require a test database
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { GET, POST } from '../music/route';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    track: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    genre: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    trackPlatform: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/blob', () => ({
  uploadToBlob: jest.fn(),
  isBlobConfigured: jest.fn(() => false),
  getBlobPublicUrl: jest.fn(),
}));

describe('/api/music', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return tracks successfully', async () => {
      const { default: prisma } = await import('@/lib/prisma');

      const mockTracks = [
        {
          id: '1',
          title: 'Test Track',
          artist: 'Test Artist',
          releaseDate: new Date(),
          isPublished: true,
          featured: false,
          TrackPlatform: [],
          GenresOnTracks: [],
        },
      ];

      (prisma.track.findMany as jest.Mock).mockResolvedValue(mockTracks);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data.data)).toBe(true);
      expect(prisma.track.findMany).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const { default: prisma } = await import('@/lib/prisma');
      (prisma.track.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database error');
    });
  });

  describe('POST', () => {
    it('should require authentication', async () => {
      const { auth } = await import('@/auth');
      (auth as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/music', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test',
          artist: 'Artist',
          releaseDate: '2024-01-01',
          type: 'single',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Unauthorized');
    });

    it('should validate request body', async () => {
      const { auth } = await import('@/auth');
      (auth as jest.Mock).mockResolvedValue({
        user: { id: '1', role: 'ADMIN' },
      });

      const request = new NextRequest('http://localhost/api/music', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Missing required fields - title is empty string which fails min(1)
          title: '',
          artist: '',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      // The error format from Zod includes 'details' field
      expect(data.error === 'Invalid input data' || data.error === 'Invalid JSON body').toBe(true);
    });
  });
});
