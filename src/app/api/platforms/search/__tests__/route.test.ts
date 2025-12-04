/**
 * Tests for /api/platforms/search route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { POST } from '../route';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/services/platform-search', () => ({
  searchTrackOnAllPlatforms: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('/api/platforms/search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should search tracks for admin user', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');
    const { searchTrackOnAllPlatforms } = await import('@/lib/services/platform-search');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', email: 'admin@test.com', role: 'ADMIN' },
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      role: 'ADMIN',
    });

    (searchTrackOnAllPlatforms as jest.Mock).mockResolvedValue({
      spotify: [],
      youtube: [],
    });

    const request = new NextRequest('http://localhost/api/platforms/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artist: 'Artist', title: 'Track' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toBeDefined();
    expect(searchTrackOnAllPlatforms).toHaveBeenCalledWith('Artist', 'Track');
  });

  it('should return 401 for unauthenticated user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/platforms/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artist: 'Artist', title: 'Track' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 403 for non-admin user', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', email: 'user@test.com', role: 'USER' },
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      role: 'USER',
    });

    const request = new NextRequest('http://localhost/api/platforms/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artist: 'Artist', title: 'Track' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('should return 400 if artist or title is missing', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', email: 'admin@test.com', role: 'ADMIN' },
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      role: 'ADMIN',
    });

    const request = new NextRequest('http://localhost/api/platforms/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artist: 'Artist' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('artist et title requis');
  });

  it('should use cache for repeated searches', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');
    const platformSearch = await import('@/lib/services/platform-search');
    const searchTrackOnAllPlatforms = platformSearch.searchTrackOnAllPlatforms as jest.Mock;

    // Clear the mock call history
    searchTrackOnAllPlatforms.mockClear();

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', email: 'admin@test.com', role: 'ADMIN' },
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      role: 'ADMIN',
    });

    const mockResults = {
      spotify: [],
      youtube: [],
    };

    searchTrackOnAllPlatforms.mockResolvedValue(mockResults);

    // First call - should call searchTrackOnAllPlatforms
    const request1 = new NextRequest('http://localhost/api/platforms/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artist: 'TestArtist', title: 'TestTrack' }),
    });
    const response1 = await POST(request1);
    expect(response1.status).toBe(200);
    const data1 = await response1.json();
    expect(data1).toEqual(mockResults);
    expect(searchTrackOnAllPlatforms).toHaveBeenCalledTimes(1);
    expect(searchTrackOnAllPlatforms).toHaveBeenCalledWith('TestArtist', 'TestTrack');

    // Second call with same params - should use cache, so searchTrackOnAllPlatforms should not be called again
    const request2 = new NextRequest('http://localhost/api/platforms/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artist: 'TestArtist', title: 'TestTrack' }),
    });
    const response2 = await POST(request2);
    expect(response2.status).toBe(200);
    const data2 = await response2.json();
    expect(data2).toEqual(mockResults);
    // Should still be called only once (cache used on second call)
    expect(searchTrackOnAllPlatforms).toHaveBeenCalledTimes(1);

    // Third call with different params - should call searchTrackOnAllPlatforms again
    const request3 = new NextRequest('http://localhost/api/platforms/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artist: 'OtherArtist', title: 'OtherTrack' }),
    });
    const response3 = await POST(request3);
    expect(response3.status).toBe(200);
    // Should be called again for different search
    expect(searchTrackOnAllPlatforms).toHaveBeenCalledTimes(2);
    expect(searchTrackOnAllPlatforms).toHaveBeenCalledWith('OtherArtist', 'OtherTrack');
  });
});
