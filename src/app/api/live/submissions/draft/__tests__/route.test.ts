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

const OWN_URL =
  'https://abc123.public.blob.vercel-storage.com/live-audio/live-audio-user1-1700000000000-abc.mp3';
const OTHER_USER_URL =
  'https://abc123.public.blob.vercel-storage.com/live-audio/live-audio-user2-1700000000000-abc.mp3';

function draftRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/live/submissions/draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

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
        fileUrl: OWN_URL,
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
        fileUrl: OWN_URL,
        fileName: 'file.mp3',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non authentifié');
  });

  describe('refus', () => {
    beforeEach(async () => {
      const { auth } = await import('@/auth');
      (auth as jest.Mock).mockResolvedValue({ user: { id: 'user1', role: 'USER' } });
    });

    it('renvoie 400 si fileUrl pointe vers un autre hôte', async () => {
      const { default: mockPrisma } = await import('@/lib/prisma');
      const response = await POST(
        draftRequest({ fileUrl: 'https://example.com/file.mp3', fileName: 'file.mp3' })
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('URL de fichier invalide');
      expect(mockPrisma.liveSubmission.create).not.toHaveBeenCalled();
      expect(mockPrisma.liveSubmission.update).not.toHaveBeenCalled();
    });

    it('renvoie 400 si fileUrl appartient à un autre utilisateur', async () => {
      const { default: mockPrisma } = await import('@/lib/prisma');
      const response = await POST(draftRequest({ fileUrl: OTHER_USER_URL, fileName: 'file.mp3' }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('URL de fichier invalide');
      expect(mockPrisma.liveSubmission.create).not.toHaveBeenCalled();
    });

    it('renvoie 404 si le draftId appartient à un autre utilisateur', async () => {
      const { default: mockPrisma } = await import('@/lib/prisma');
      const { deleteAudioFile } = await import('@/lib/live/upload');
      (mockPrisma.liveSubmission.findUnique as jest.Mock).mockResolvedValue({
        id: 'draft-x',
        userId: 'user2',
        isDraft: true,
        fileUrl: OTHER_USER_URL,
      });

      const response = await POST(
        draftRequest({ fileUrl: OWN_URL, fileName: 'file.mp3', draftId: 'draft-x' })
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Brouillon introuvable');
      expect(mockPrisma.liveSubmission.update).not.toHaveBeenCalled();
      expect(deleteAudioFile).not.toHaveBeenCalled();
    });

    it("renvoie 404 si le draftId n'est plus un brouillon", async () => {
      const { default: mockPrisma } = await import('@/lib/prisma');
      (mockPrisma.liveSubmission.findUnique as jest.Mock).mockResolvedValue({
        id: 'draft-x',
        userId: 'user1',
        isDraft: false,
        fileUrl: OWN_URL,
      });

      const response = await POST(
        draftRequest({ fileUrl: OWN_URL, fileName: 'file.mp3', draftId: 'draft-x' })
      );

      expect(response.status).toBe(404);
      expect(mockPrisma.liveSubmission.update).not.toHaveBeenCalled();
    });

    it("renvoie 404 si le draftId n'existe pas", async () => {
      const { default: mockPrisma } = await import('@/lib/prisma');
      (mockPrisma.liveSubmission.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await POST(
        draftRequest({ fileUrl: OWN_URL, fileName: 'file.mp3', draftId: 'inconnu' })
      );

      expect(response.status).toBe(404);
      expect(mockPrisma.liveSubmission.update).not.toHaveBeenCalled();
    });
  });
});
