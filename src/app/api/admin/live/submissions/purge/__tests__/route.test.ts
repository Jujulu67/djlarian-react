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

jest.mock('@/lib/blob', () => ({
  getIsBlobConfigured: jest.fn(() => false),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readdirSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('@vercel/blob', () => ({
  del: jest.fn(),
}));

describe('/api/admin/live/submissions/purge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should purge submissions for admin user', async () => {
    const { auth } = await import('@/auth');
    const { default: mockPrisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'ADMIN' },
    });

    (mockPrisma.liveSubmission.findMany as jest.Mock).mockResolvedValue([
      { id: 'submission-1', fileUrl: '/uploads/live-audio/file1.mp3' },
    ]);

    (mockPrisma.liveSubmission.deleteMany as jest.Mock).mockResolvedValue({
      count: 1,
    });

    const request = new NextRequest('http://localhost/api/admin/live/submissions/purge', {
      method: 'DELETE',
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toBeDefined();
  });

  it('should return 401 for non-admin user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    const request = new NextRequest('http://localhost/api/admin/live/submissions/purge', {
      method: 'DELETE',
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Non autorisé');
  });
  it('should handle Blob storage deletion', async () => {
    const { auth } = await import('@/auth');
    const { default: mockPrisma } = await import('@/lib/prisma');
    const { getIsBlobConfigured } = await import('@/lib/blob');
    const { del } = await import('@vercel/blob');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'ADMIN' },
    });

    (getIsBlobConfigured as jest.Mock).mockReturnValue(true);

    (mockPrisma.liveSubmission.findMany as jest.Mock).mockResolvedValue([
      { id: 'sub1', fileUrl: 'http://blob.store/file1.mp3' },
    ]);

    (mockPrisma.liveSubmission.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

    const request = new NextRequest('http://localhost/api/admin/live/submissions/purge', {
      method: 'DELETE',
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(del).toHaveBeenCalledWith('http://blob.store/file1.mp3');
    expect(data.data.filesDeleted).toBe(1);
  });

  it('should handle Local storage deletion', async () => {
    const { auth } = await import('@/auth');
    const { default: mockPrisma } = await import('@/lib/prisma');
    const { getIsBlobConfigured } = await import('@/lib/blob');
    const fs = await import('fs');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'ADMIN' },
    });

    (getIsBlobConfigured as jest.Mock).mockReturnValue(false);

    (mockPrisma.liveSubmission.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.liveSubmission.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readdirSync as jest.Mock).mockReturnValue(['file1.mp3', '.gitkeep']);

    const request = new NextRequest('http://localhost/api/admin/live/submissions/purge', {
      method: 'DELETE',
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(fs.unlinkSync).toHaveBeenCalledTimes(1); // Should skip .gitkeep
    expect(data.data.filesDeleted).toBe(1);
  });

  it('should handle errors during deletion', async () => {
    const { auth } = await import('@/auth');
    const { default: mockPrisma } = await import('@/lib/prisma');
    const { getIsBlobConfigured } = await import('@/lib/blob');
    const { del } = await import('@vercel/blob');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'ADMIN' },
    });

    (getIsBlobConfigured as jest.Mock).mockReturnValue(true);

    (mockPrisma.liveSubmission.findMany as jest.Mock).mockResolvedValue([
      { id: 'sub1', fileUrl: 'http://blob.store/file1.mp3' },
    ]);

    (del as jest.Mock).mockRejectedValue(new Error('Delete failed'));

    const request = new NextRequest('http://localhost/api/admin/live/submissions/purge', {
      method: 'DELETE',
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.fileErrors).toBe(1);
  });
});
