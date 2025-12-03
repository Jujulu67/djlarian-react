/**
 * Tests for /api/admin/live/submissions/[id] route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { PATCH } from '../route';

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
      updateMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('/api/admin/live/submissions/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update submission for admin user', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'ADMIN' },
    });

    (prisma.liveSubmission.findUnique as jest.Mock).mockResolvedValue({
      id: 'submission-1',
      isDraft: false,
      User: {
        id: 'user1',
        name: 'User 1',
        email: 'user1@test.com',
        image: null,
      },
    });

    (prisma.liveSubmission.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    (prisma.liveSubmission.update as jest.Mock).mockResolvedValue({
      id: 'submission-1',
      userId: 'user1',
      status: 'APPROVED',
      isRolled: false,
      isPinned: false,
      isDraft: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      User: {
        id: 'user1',
        name: 'User 1',
        email: 'user1@test.com',
        image: null,
      },
    });

    const request = new NextRequest('http://localhost/api/admin/live/submissions/submission-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'APPROVED' }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'submission-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toBeDefined();
  });

  it('should return 401 for non-admin user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    const request = new NextRequest('http://localhost/api/admin/live/submissions/submission-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'APPROVED' }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'submission-1' }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non autorisé');
  });
});
