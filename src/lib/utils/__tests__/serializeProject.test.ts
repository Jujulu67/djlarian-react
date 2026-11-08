import { serializeProject, serializeProjects } from '../serializeProject';
import { Project as PrismaProject } from '@prisma/client';
import { Project } from '@/lib/domain/projects';

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

  it.each([
    [
      'should normalize progress to 100 for TERMINE status when progress is null',
      'project-6',
      'Completed Project',
      'TERMINE',
      null,
      'TERMINE',
      100,
    ],
    [
      'should keep existing progress for TERMINE status when progress is not null',
      'project-7',
      'Completed Project',
      'TERMINE',
      90,
      'TERMINE',
      90,
    ],
    [
      'should not normalize progress for non-TERMINE status',
      'project-8',
      'In Progress Project',
      'EN_COURS',
      50,
      'EN_COURS',
      50,
    ],
    [
      'should handle TERMINE status with progress 100',
      'project-11',
      'Completed Project',
      'TERMINE',
      100,
      'TERMINE',
      100,
    ],
    [
      'should handle TERMINE status with progress not null and not 100',
      'project-12',
      'Completed Project',
      'TERMINE',
      90,
      'TERMINE',
      90,
    ],
  ] as const)('%s', (_title, id, name, status, progress, expectedStatus, expectedProgress) => {
    const prismaProject = {
      id,
      name,
      status,
      userId: 'user-1',
      releaseDate: null,
      progress,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z'),
    } as PrismaProject;

    const result = serializeProject(prismaProject);

    expect(result.status).toBe(expectedStatus);
    expect(result.progress).toBe(expectedProgress);
  });

  it('should handle null deadline', () => {
    const prismaProject = {
      id: 'project-9',
      name: 'Test Project',
      status: 'pending',
      userId: 'user-1',
      releaseDate: null,
      deadline: null,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z'),
    } as PrismaProject;

    const result = serializeProject(prismaProject);

    expect(result.deadline).toBeNull();
  });

  it('should handle deadline with date', () => {
    const prismaProject = {
      id: 'project-10',
      name: 'Test Project',
      status: 'pending',
      userId: 'user-1',
      releaseDate: null,
      deadline: new Date('2024-12-31T00:00:00Z'),
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z'),
    } as PrismaProject;

    const result = serializeProject(prismaProject);

    expect(result.deadline).toBe('2024-12-31T00:00:00.000Z');
  });

  it('should handle project with all optional fields null', () => {
    const prismaProject = {
      id: 'project-13',
      name: 'Test Project',
      status: 'EN_COURS',
      userId: 'user-1',
      releaseDate: null,
      deadline: null,
      progress: null,
      style: null,
      collab: null,
      label: null,
      labelFinal: null,
      externalLink: null,
      note: null,
      streamsJ7: null,
      streamsJ14: null,
      streamsJ21: null,
      streamsJ28: null,
      streamsJ56: null,
      streamsJ84: null,
      streamsJ180: null,
      streamsJ365: null,
      order: 0,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z'),
    } as PrismaProject;

    const result = serializeProject(prismaProject);

    expect(result.id).toBe('project-13');
    expect(result.releaseDate).toBeNull();
    expect(result.deadline).toBeNull();
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
