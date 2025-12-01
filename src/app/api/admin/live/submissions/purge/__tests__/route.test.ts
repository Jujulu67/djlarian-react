/**
 * Tests for /api/admin/live/submissions/purge route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { DELETE } from '../route';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    liveSubmission: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/live/upload', () => ({
  deleteAudioFile: jest.fn(),
}));

describe('/api/admin/live/submissions/purge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DELETE', () => {
    it('should require authentication', async () => {
      const { auth } = await import('@/auth');
      (auth as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/admin/live/submissions/purge', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      expect(response.status).toBe(401);
    });

    it('should require ADMIN role', async () => {
      const { auth } = await import('@/auth');
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', role: 'USER' },
      });

      const request = new NextRequest('http://localhost/api/admin/live/submissions/purge', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      expect(response.status).toBe(403);
    });

    it('should purge all submissions and files', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');
      const { deleteAudioFile } = await import('@/lib/live/upload');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'admin-123', role: 'ADMIN' },
      });

      // Mock finding submissions
      (prisma.liveSubmission.findMany as jest.Mock).mockResolvedValue([
        { id: 'sub-1', fileUrl: 'https://blob.com/1.mp3' },
        { id: 'sub-2', fileUrl: 'https://blob.com/2.mp3' },
      ]);

      (prisma.liveSubmission.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });

      const request = new NextRequest('http://localhost/api/admin/live/submissions/purge', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.dbDeleted).toBe(2);

      // Should fetch all submissions
      expect(prisma.liveSubmission.findMany).toHaveBeenCalled();

      // Should delete files
      expect(deleteAudioFile).toHaveBeenCalledWith('https://blob.com/1.mp3');
      expect(deleteAudioFile).toHaveBeenCalledWith('https://blob.com/2.mp3');

      // Should delete records
      expect(prisma.liveSubmission.deleteMany).toHaveBeenCalled();
    });
  });
});
