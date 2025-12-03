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
    warn: jest.fn(),
  },
}));

describe('/api/admin/live/submissions/purge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should purge submissions for admin user', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'ADMIN' },
    });

    (prisma.liveSubmission.findMany as jest.Mock).mockResolvedValue([
      { id: 'submission-1', fileUrl: '/uploads/live-audio/file1.mp3' },
    ]);

    (prisma.liveSubmission.deleteMany as jest.Mock).mockResolvedValue({
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
});
