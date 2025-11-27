/**
 * Tests for /api/projects route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { GET, POST } from '../route';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    project: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('next/cache', () => ({
  unstable_cache: jest.fn((fn) => fn),
  revalidateTag: jest.fn(),
}));

jest.mock('@/lib/utils/serializeProject', () => ({
  serializeProjects: jest.fn((projects) => projects),
  serializeProject: jest.fn((project) => project),
}));

describe('/api/projects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return projects for authenticated user', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user1', role: 'USER' },
      });

      const mockProjects = [
        {
          id: '1',
          name: 'Project 1',
          status: 'EN_COURS',
          userId: 'user1',
          User: { id: 'user1', name: 'User', email: 'user@test.com' },
        },
      ];

      (prisma.project.findMany as jest.Mock).mockResolvedValue(mockProjects);

      const request = new NextRequest('http://localhost/api/projects');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(prisma.project.findMany).toHaveBeenCalled();
    });

    it('should filter by status when provided', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user1', role: 'USER' },
      });

      (prisma.project.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/projects?status=TERMINE');
      await GET(request);

      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'TERMINE',
            userId: 'user1',
          }),
        })
      );
    });

    it('should support pagination with limit and offset', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user1', role: 'USER' },
      });

      (prisma.project.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/projects?limit=10&offset=20');
      await GET(request);

      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
    });

    it('should allow admin to see all projects', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
      });

      (prisma.project.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/projects?all=true');
      await GET(request);

      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            userId: expect.anything(),
          }),
        })
      );
    });

    it('should return 401 for unauthenticated user', async () => {
      const { auth } = await import('@/auth');
      (auth as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/projects');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Non autorisé');
    });
  });

  describe('POST', () => {
    it('should create a new project', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user1', role: 'USER' },
      });

      (prisma.project.findFirst as jest.Mock).mockResolvedValue({ order: 0 });
      (prisma.project.create as jest.Mock).mockResolvedValue({
        id: 'new-project',
        name: 'New Project',
        status: 'EN_COURS',
        userId: 'user1',
        order: 1,
        User: { id: 'user1', name: 'User', email: 'user@test.com' },
      });

      const request = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Project',
          status: 'EN_COURS',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('New Project');
      expect(prisma.project.create).toHaveBeenCalled();
    });

    it('should require name field', async () => {
      const { auth } = await import('@/auth');
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user1', role: 'USER' },
      });

      const request = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'EN_COURS',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('nom du projet');
    });

    it('should return 401 for unauthenticated user', async () => {
      const { auth } = await import('@/auth');
      (auth as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Non autorisé');
    });
  });
});
