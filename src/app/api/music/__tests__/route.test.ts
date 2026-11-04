/**
 * Tests for POST /api/music (publication programmée)
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { POST } from '../route';

jest.mock('@/auth', () => ({ auth: jest.fn() }));

jest.mock('@/lib/prisma', () => {
  const mockPrisma: any = {
    track: { create: jest.fn(), findUniqueOrThrow: jest.fn() },
    genre: { upsert: jest.fn() },
    user: { findFirst: jest.fn() },
  };
  mockPrisma.$transaction = jest.fn((callback: any) => callback(mockPrisma));
  return { __esModule: true, default: mockPrisma };
});

jest.mock('@/lib/api/musicService', () => ({ formatTrackData: jest.fn((track) => track) }));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), debug: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

const create = async (publishAt?: string) => {
  const { auth } = await import('@/auth');
  const { default: prisma } = (await import('@/lib/prisma')) as any;
  (auth as jest.Mock).mockResolvedValue({ user: { id: 'admin1', role: 'ADMIN' } });
  prisma.user.findFirst.mockResolvedValue({ id: 'admin1' });
  prisma.track.create.mockResolvedValue({ id: 'track-1' });
  prisma.track.findUniqueOrThrow.mockResolvedValue({ id: 'track-1' });
  const response = await POST(
    new NextRequest('http://localhost/api/music', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Titre',
        artist: 'Artiste',
        releaseDate: '2026-11-01',
        type: 'single',
        imageId: 'abc123-def456',
        ...(publishAt !== undefined && { publishAt }),
      }),
    })
  );
  return { response, data: prisma.track.create.mock.calls[0]?.[0]?.data };
};

describe('POST /api/music', () => {
  beforeEach(() => jest.clearAllMocks());

  it('crée un morceau non publié si publishAt est dans le futur', async () => {
    const { response, data } = await create(new Date(Date.now() + 86400000).toISOString());
    expect(response.status).toBeLessThan(300);
    expect(data.isPublished).toBe(false);
  });

  it('publie tout de suite sans publishAt ou avec une date passée', async () => {
    expect((await create()).data.isPublished).toBe(true);
    jest.clearAllMocks();
    const past = await create(new Date(Date.now() - 86400000).toISOString());
    expect(past.data.isPublished).toBe(true);
  });
});
