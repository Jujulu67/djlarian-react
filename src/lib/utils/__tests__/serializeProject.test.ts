import { Project as PrismaProject } from '@prisma/client';

import { serializeProject, serializeProjects } from '../serializeProject';

describe('serializeProject', () => {
  const mockDate = new Date('2024-01-15T10:30:00.000Z');
  const mockReleaseDate = new Date('2024-06-01T00:00:00.000Z');

  const createMockPrismaProject = (overrides = {}): PrismaProject => ({
    id: 'project-1',
    title: 'Test Project',
    description: 'Test Description',
    status: 'pending',
    releaseDate: mockReleaseDate,
    userId: 'user-1',
    createdAt: mockDate,
    updatedAt: mockDate,
    imageId: null,
    platforms: null,
    genre: null,
    type: null,
    artist: null,
    ...overrides,
  });

  describe('serializeProject', () => {
    it('should serialize a basic project', () => {
      const prismaProject = createMockPrismaProject();
      const result = serializeProject(prismaProject);

      expect(result.id).toBe('project-1');
      expect(result.title).toBe('Test Project');
      expect(result.status).toBe('pending');
      expect(result.createdAt).toBe(mockDate.toISOString());
      expect(result.updatedAt).toBe(mockDate.toISOString());
    });

    it('should serialize releaseDate to ISO string', () => {
      const prismaProject = createMockPrismaProject();
      const result = serializeProject(prismaProject);

      expect(result.releaseDate).toBe(mockReleaseDate.toISOString());
    });

    it('should handle null releaseDate', () => {
      const prismaProject = createMockPrismaProject({ releaseDate: null });
      const result = serializeProject(prismaProject);

      expect(result.releaseDate).toBeNull();
    });

    it('should serialize project with User', () => {
      const prismaProject = {
        ...createMockPrismaProject(),
        User: {
          id: 'user-1',
          name: 'John Doe',
          email: 'john@example.com',
        },
      };
      const result = serializeProject(prismaProject);

      expect(result.User).toEqual({
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
      });
    });

    it('should handle project without User', () => {
      const prismaProject = createMockPrismaProject();
      const result = serializeProject(prismaProject);

      expect(result.User).toBeUndefined();
    });

    it('should handle User with null name and email', () => {
      const prismaProject = {
        ...createMockPrismaProject(),
        User: {
          id: 'user-1',
          name: null,
          email: null,
        },
      };
      const result = serializeProject(prismaProject);

      expect(result.User).toEqual({
        id: 'user-1',
        name: null,
        email: null,
      });
    });

    it('should preserve all project fields', () => {
      const prismaProject = createMockPrismaProject({
        description: 'Custom Description',
        imageId: 'image-123',
        platforms: { youtube: 'url' },
        genre: ['House', 'Techno'],
        type: 'single',
        artist: 'Test Artist',
      });
      const result = serializeProject(prismaProject);

      expect(result.description).toBe('Custom Description');
      expect(result.imageId).toBe('image-123');
      expect(result.platforms).toEqual({ youtube: 'url' });
      expect(result.genre).toEqual(['House', 'Techno']);
      expect(result.type).toBe('single');
      expect(result.artist).toBe('Test Artist');
    });

    it('should cast status to ProjectStatus type', () => {
      const prismaProject = createMockPrismaProject({ status: 'approved' });
      const result = serializeProject(prismaProject);

      expect(result.status).toBe('approved');
    });
  });

  describe('serializeProjects', () => {
    it('should serialize an array of projects', () => {
      const projects = [
        createMockPrismaProject({ id: 'project-1', title: 'Project 1' }),
        createMockPrismaProject({ id: 'project-2', title: 'Project 2' }),
        createMockPrismaProject({ id: 'project-3', title: 'Project 3' }),
      ];

      const result = serializeProjects(projects);

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('project-1');
      expect(result[1].id).toBe('project-2');
      expect(result[2].id).toBe('project-3');
      expect(result[0].createdAt).toBe(mockDate.toISOString());
    });

    it('should handle empty array', () => {
      const result = serializeProjects([]);
      expect(result).toEqual([]);
    });

    it('should serialize projects with Users', () => {
      const projects = [
        {
          ...createMockPrismaProject({ id: 'project-1' }),
          User: { id: 'user-1', name: 'User 1', email: 'user1@example.com' },
        },
        {
          ...createMockPrismaProject({ id: 'project-2' }),
          User: { id: 'user-2', name: 'User 2', email: 'user2@example.com' },
        },
      ];

      const result = serializeProjects(projects);

      expect(result[0].User?.name).toBe('User 1');
      expect(result[1].User?.name).toBe('User 2');
    });

    it('should handle mixed projects with and without Users', () => {
      const projects = [
        {
          ...createMockPrismaProject({ id: 'project-1' }),
          User: { id: 'user-1', name: 'User 1', email: 'user1@example.com' },
        },
        createMockPrismaProject({ id: 'project-2' }),
      ];

      const result = serializeProjects(projects);

      expect(result[0].User).toBeDefined();
      expect(result[1].User).toBeUndefined();
    });
  });
});
