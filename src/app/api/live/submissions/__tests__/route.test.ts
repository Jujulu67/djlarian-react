/**
 * Tests for /api/live/submissions route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { PATCH, DELETE } from '../route';

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

describe('/api/live/submissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
        fileUrl: 'https://blob.vercel-storage.com/file.mp3',
      });

      const request = new NextRequest('http://localhost/api/live/submissions?id=sub-123', {
        method: 'DELETE',
      });

      const response = await DELETE(request);

      expect(response.status).toBe(200);
      expect(deleteFromBlob).toHaveBeenCalledWith('https://blob.vercel-storage.com/file.mp3');
      expect(prisma.liveSubmission.delete).toHaveBeenCalledWith({
        where: { id: 'sub-123' },
      });
    });
  });
});
