/**
 * Tests for /api/projects/[id] route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { GET, PATCH } from '../route';

jest.mock('@/lib/utils/serializeProject', () => ({
  serializeProject: jest.fn((project) => project),
}));

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    project: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('next/cache', () => ({
  revalidateTag: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('/api/projects/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return project for owner', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user1', role: 'USER' },
      });

      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: 'project-1',
        userId: 'user1',
        name: 'Test Project',
        User: {
          id: 'user1',
          name: 'User 1',
          email: 'user1@test.com',
        },
      });

      const request = new NextRequest('http://localhost/api/projects/project-1');
      const response = await GET(request, { params: Promise.resolve({ id: 'project-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
    });

    it('should return 401 for unauthenticated user', async () => {
      const { auth } = await import('@/auth');
      (auth as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/projects/project-1');
      const response = await GET(request, { params: Promise.resolve({ id: 'project-1' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Non autorisé');
    });
  });

  describe('PATCH', () => {
    it('should update project for owner', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user1', role: 'USER' },
      });

      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: 'project-1',
        userId: 'user1',
      });

      (prisma.project.update as jest.Mock).mockResolvedValue({
        id: 'project-1',
        name: 'Updated Project',
      });

      const request = new NextRequest('http://localhost/api/projects/project-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Project' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'project-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
    });
  });
});
