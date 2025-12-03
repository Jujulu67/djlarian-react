/**
 * Tests for /api/profile/delete-avatar route
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
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/blob', () => ({
  deleteFromBlob: jest.fn(),
}));

jest.mock('@/lib/utils/getStorageConfig', () => ({
  shouldUseBlobStorage: jest.fn(() => false),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('/api/profile/delete-avatar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete avatar for authenticated user', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      image: '/uploads/avatars/avatar.jpg',
    });

    (prisma.user.update as jest.Mock).mockResolvedValue({
      id: 'user1',
      image: null,
    });

    const request = new NextRequest('http://localhost/api/profile/delete-avatar', {
      method: 'DELETE',
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should return 401 for unauthenticated user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/profile/delete-avatar', {
      method: 'DELETE',
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non autorisé');
  });
});
