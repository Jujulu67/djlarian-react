/**
 * Tests for /api/live/submissions route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST, PATCH, DELETE } from '../route';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    liveSubmission: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/lib/blob', () => ({
  getIsBlobConfigured: jest.fn(() => true),
  deleteFromBlob: jest.fn(),
  uploadToBlob: jest.fn(),
}));

jest.mock('@/lib/utils/getStorageConfig', () => ({
  shouldUseBlobStorage: jest.fn(() => true),
}));

jest.mock('@/lib/api/rateLimiter', () => ({
  rateLimit: jest.fn(() => null),
}));

const OWN_URL =
  'https://abc123.public.blob.vercel-storage.com/live-audio/live-audio-user-123-1700000000000-abc.mp3';
const OTHER_USER_URL =
  'https://abc123.public.blob.vercel-storage.com/live-audio/live-audio-user-999-1700000000000-abc.mp3';

describe('/api/live/submissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST (JSON avec fileUrl)', () => {
    function postRequest(fileUrl: string) {
      return new NextRequest('http://localhost/api/live/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Mon titre', fileUrl, fileName: 'file.mp3', fileSize: 10 }),
      });
    }

    async function setup() {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');
      (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-123' } });
      (prisma as any).adminSettings = { findUnique: jest.fn().mockResolvedValue(null) };
      (prisma.liveSubmission as any).create = jest.fn().mockResolvedValue({ id: 'sub-1' });
      return prisma;
    }

    it('crée la soumission avec une URL valide de l utilisateur', async () => {
      const prisma = await setup();
      const response = await POST(postRequest(OWN_URL));

      expect(response.status).toBe(201);
      expect((prisma.liveSubmission as any).create).toHaveBeenCalled();
    });

    it('renvoie 400 si fileUrl pointe vers un autre hôte', async () => {
      const prisma = await setup();
      const response = await POST(postRequest('https://example.com/file.mp3'));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('URL de fichier invalide');
      expect((prisma.liveSubmission as any).create).not.toHaveBeenCalled();
    });

    it('renvoie 400 si fileUrl appartient à un autre utilisateur', async () => {
      const prisma = await setup();
      const response = await POST(postRequest(OTHER_USER_URL));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('URL de fichier invalide');
      expect((prisma.liveSubmission as any).create).not.toHaveBeenCalled();
    });
  });

  describe('PATCH', () => {
    it('should require authentication', async () => {
      const { auth } = await import('@/auth');
      (auth as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/live/submissions', {
        method: 'PATCH',
        body: JSON.stringify({
          id: 'sub-123',
          title: 'New Title',
        }),
      });

      const response = await PATCH(request);
      expect(response.status).toBe(401);
    });

    it('should update submission successfully', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user-123' },
      });

      (prisma.liveSubmission.findUnique as jest.Mock).mockResolvedValue({
        id: 'sub-123',
        userId: 'user-123',
        title: 'Old Title',
      });

      (prisma.liveSubmission.update as jest.Mock).mockResolvedValue({
        id: 'sub-123',
        title: 'New Title',
        description: 'New Desc',
      });

      const request = new NextRequest('http://localhost/api/live/submissions', {
        method: 'PATCH',
        body: JSON.stringify({
          id: 'sub-123',
          title: 'New Title',
          description: 'New Desc',
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.title).toBe('New Title');
      expect(prisma.liveSubmission.update).toHaveBeenCalledWith({
        where: { id: 'sub-123' },
        data: {
          title: 'New Title',
          description: 'New Desc',
        },
      });
    });

    it('should prevent updating others submissions', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user-123' },
      });

      (prisma.liveSubmission.findUnique as jest.Mock).mockResolvedValue({
        id: 'sub-123',
        userId: 'other-user',
      });

      const request = new NextRequest('http://localhost/api/live/submissions', {
        method: 'PATCH',
        body: JSON.stringify({
          id: 'sub-123',
          title: 'New Title',
        }),
      });

      const response = await PATCH(request);
      expect(response.status).toBe(403);
    });
  });

  describe('DELETE', () => {
    it('should delete submission and blob file', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');
      const { deleteFromBlob } = await import('@/lib/blob');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user-123' },
      });

      (prisma.liveSubmission.findUnique as jest.Mock).mockResolvedValue({
        id: 'sub-123',
        userId: 'user-123',
        fileUrl: OWN_URL,
      });

      const request = new NextRequest('http://localhost/api/live/submissions?id=sub-123', {
        method: 'DELETE',
      });

      const response = await DELETE(request);

      expect(response.status).toBe(200);
      expect(deleteFromBlob).toHaveBeenCalledWith(OWN_URL);
      expect(prisma.liveSubmission.delete).toHaveBeenCalledWith({
        where: { id: 'sub-123' },
      });
    });
  });
});
