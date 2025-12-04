import { serializeProject, serializeProjects } from '../serializeProject';
import { Project as PrismaProject } from '@prisma/client';
import { Project } from '@/components/projects/types';

describe('serializeProject', () => {
  it('should serialize a project with all fields', () => {
    const prismaProject = {
      id: 'project-1',
      name: 'Test Project',
      style: 'Pop',
      status: 'pending',
      userId: 'user-1',
      releaseDate: new Date('2024-01-01'),
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z'),
      collab: 'Artist',
      label: 'Label',
      labelFinal: 'Final Label',
      externalLink: 'https://example.com',
      streamsJ7: 1000,
      streamsJ14: 2000,
      streamsJ21: 3000,
      streamsJ28: 4000,
      streamsJ56: 5000,
      streamsJ84: 6000,
      streamsJ180: 10000,
      streamsJ365: 20000,
    } as PrismaProject;

    const result = serializeProject(prismaProject);

    expect(result.id).toBe('project-1');
    expect(result.releaseDate).toBe('2024-01-01T00:00:00.000Z');
    expect(result.createdAt).toBe('2024-01-01T00:00:00.000Z');
    expect(result.updatedAt).toBe('2024-01-02T00:00:00.000Z');
    expect(result.status).toBe('pending');
  });

  it('should handle null releaseDate', () => {
    const prismaProject = {
      id: 'project-2',
      name: 'Test Project',
      status: 'pending',
      userId: 'user-1',
      releaseDate: null,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z'),
    } as PrismaProject;

    const result = serializeProject(prismaProject);

    expect(result.releaseDate).toBeNull();
  });

  it('should include User if present', () => {
    const prismaProject = {
      id: 'project-3',
      name: 'Test Project',
      status: 'pending',
      userId: 'user-1',
      releaseDate: null,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z'),
      User: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
      },
    } as PrismaProject & {
      User?: { id: string; name: string | null; email: string | null };
    };

    const result = serializeProject(prismaProject);

    expect(result.User).toEqual({
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
    });
  });

  it('should not include User if not present', () => {
    const prismaProject = {
      id: 'project-4',
      name: 'Test Project',
      status: 'pending',
      userId: 'user-1',
      releaseDate: null,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z'),
    } as PrismaProject;

    const result = serializeProject(prismaProject);

    expect(result.User).toBeUndefined();
  });

  it('should handle User with null name and email', () => {
    const prismaProject = {
      id: 'project-5',
      name: 'Test Project',
      status: 'pending',
      userId: 'user-1',
      releaseDate: null,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z'),
      User: {
        id: 'user-1',
        name: null,
        email: null,
      },
    } as PrismaProject & {
      User?: { id: string; name: string | null; email: string | null };
    };

    const result = serializeProject(prismaProject);

    expect(result.User).toEqual({
      id: 'user-1',
      name: null,
      email: null,
    });
  });
});

describe('serializeProjects', () => {
  it('should serialize an array of projects', () => {
    const prismaProjects = [
      {
        id: 'project-1',
        name: 'Project 1',
        status: 'pending',
        userId: 'user-1',
        releaseDate: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
      },
      {
        id: 'project-2',
        name: 'Project 2',
        status: 'released',
        userId: 'user-1',
        releaseDate: new Date('2024-01-02'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
      },
    ] as PrismaProject[];

    const result = serializeProjects(prismaProjects);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('project-1');
    expect(result[1].id).toBe('project-2');
  });

  it('should handle empty array', () => {
    const result = serializeProjects([]);

    expect(result).toEqual([]);
  });
});
