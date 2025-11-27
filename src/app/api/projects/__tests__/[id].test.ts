/**
 * Tests for /api/projects/[id] route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { GET, PATCH, DELETE } from '../[id]/route';

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
      delete: jest.fn(),
    },
  },
}));

jest.mock('next/cache', () => ({
  revalidateTag: jest.fn(),
}));

jest.mock('@/lib/utils/serializeProject', () => ({
  serializeProject: jest.fn((project) => project),
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

      const mockProject = {
        id: 'project1',
        name: 'Test Project',
        userId: 'user1',
        User: { id: 'user1', name: 'User', email: 'user@test.com' },
      };

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      const context = { params: Promise.resolve({ id: 'project1' }) };
      const request = new NextRequest('http://localhost/api/projects/project1');
      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('project1');
    });

    it('should allow admin to access any project', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
      });

      const mockProject = {
        id: 'project1',
        name: 'Test Project',
        userId: 'user2',
        User: { id: 'user2', name: 'User', email: 'user@test.com' },
      };

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      const context = { params: Promise.resolve({ id: 'project1' }) };
      const request = new NextRequest('http://localhost/api/projects/project1');
      const response = await GET(request, context);

      expect(response.status).toBe(200);
    });

    it('should return 403 for non-owner non-admin', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user2', role: 'USER' },
      });

      const mockProject = {
        id: 'project1',
        name: 'Test Project',
        userId: 'user1',
        User: { id: 'user1', name: 'User', email: 'user@test.com' },
      };

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      const context = { params: Promise.resolve({ id: 'project1' }) };
      const request = new NextRequest('http://localhost/api/projects/project1');
      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Accès refusé');
    });

    it('should return 404 for non-existent project', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user1', role: 'USER' },
      });

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);

      const context = { params: Promise.resolve({ id: 'nonexistent' }) };
      const request = new NextRequest('http://localhost/api/projects/nonexistent');
      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Projet non trouvé');
    });
  });

  describe('PATCH', () => {
    it('should update project for owner', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');
      const { revalidateTag } = await import('next/cache');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user1', role: 'USER' },
      });

      const existingProject = {
        id: 'project1',
        name: 'Old Name',
        userId: 'user1',
      };

      const updatedProject = {
        ...existingProject,
        name: 'New Name',
        User: { id: 'user1', name: 'User', email: 'user@test.com' },
      };

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(existingProject);
      (prisma.project.update as jest.Mock).mockResolvedValue(updatedProject);

      const context = { params: Promise.resolve({ id: 'project1' }) };
      const request = new NextRequest('http://localhost/api/projects/project1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Name' }),
      });

      const response = await PATCH(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.name).toBe('New Name');
      expect(revalidateTag).toHaveBeenCalled();
    });

    it('should return 403 for non-owner', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user2', role: 'USER' },
      });

      const existingProject = {
        id: 'project1',
        name: 'Test',
        userId: 'user1',
      };

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(existingProject);

      const context = { params: Promise.resolve({ id: 'project1' }) };
      const request = new NextRequest('http://localhost/api/projects/project1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Name' }),
      });

      const response = await PATCH(request, context);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Accès refusé');
    });
  });

  describe('DELETE', () => {
    it('should delete project for owner', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');
      const { revalidateTag } = await import('next/cache');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user1', role: 'USER' },
      });

      const existingProject = {
        id: 'project1',
        name: 'Test',
        userId: 'user1',
      };

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(existingProject);
      (prisma.project.delete as jest.Mock).mockResolvedValue(existingProject);

      const context = { params: Promise.resolve({ id: 'project1' }) };
      const request = new NextRequest('http://localhost/api/projects/project1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.project.delete).toHaveBeenCalled();
      expect(revalidateTag).toHaveBeenCalled();
    });

    it('should return 403 for non-owner', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user2', role: 'USER' },
      });

      const existingProject = {
        id: 'project1',
        name: 'Test',
        userId: 'user1',
      };

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(existingProject);

      const context = { params: Promise.resolve({ id: 'project1' }) };
      const request = new NextRequest('http://localhost/api/projects/project1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Accès refusé');
    });
  });
});
