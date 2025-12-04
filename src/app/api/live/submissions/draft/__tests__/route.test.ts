/**
 * Tests for /api/live/submissions/draft route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { POST } from '../route';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => {
  const mockPrisma = {
    liveSubmission: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  return {
    __esModule: true,
    default: mockPrisma,
  };
});

jest.mock('@/lib/api/rateLimiter', () => ({
  rateLimit: jest.fn(() => null),
}));

jest.mock('@/lib/live/upload', () => ({
  deleteAudioFile: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  },
}));

describe('/api/live/submissions/draft', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create draft for authenticated user', async () => {
    const { auth } = await import('@/auth');
    const { default: mockPrisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    (mockPrisma.liveSubmission.findFirst as jest.Mock).mockResolvedValue(null);
    (mockPrisma.liveSubmission.create as jest.Mock).mockResolvedValue({
      id: 'draft-1',
      userId: 'user1',
      isDraft: true,
    });

    const request = new NextRequest('http://localhost/api/live/submissions/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileUrl: 'https://example.com/file.mp3',
        fileName: 'file.mp3',
        fileSize: 1024,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data).toBeDefined();
  });

  it('should return 401 for unauthenticated user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/live/submissions/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileUrl: 'https://example.com/file.mp3',
        fileName: 'file.mp3',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non authentifié');
  });
});
