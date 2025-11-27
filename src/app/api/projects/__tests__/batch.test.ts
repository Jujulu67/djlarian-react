/**
 * Tests for /api/projects/batch route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { POST } from '../batch/route';

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
      update: jest.fn(),
      $transaction: jest.fn(),
    },
  },
}));

jest.mock('next/cache', () => ({
  revalidateTag: jest.fn(),
}));

jest.mock('@/lib/utils/serializeProject', () => ({
  serializeProjects: jest.fn((projects) => projects),
  serializeProject: jest.fn((project) => project),
}));

describe('/api/projects/batch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create multiple projects in batch', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');
    const { revalidateTag } = await import('next/cache');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    (prisma.project.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.project.findFirst as jest.Mock).mockResolvedValue({ order: 0 });
    (prisma.project.$transaction as jest.Mock).mockResolvedValue([
      { id: '1', name: 'Project 1', userId: 'user1' },
      { id: '2', name: 'Project 2', userId: 'user1' },
    ]);

    const request = new NextRequest('http://localhost/api/projects/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projects: [
          { name: 'Project 1', status: 'EN_COURS' },
          { name: 'Project 2', status: 'EN_COURS' },
        ],
        overwriteDuplicates: false,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.created).toBe(2);
    expect(revalidateTag).toHaveBeenCalled();
  });

  it('should skip duplicates when overwriteDuplicates is false', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    (prisma.project.findMany as jest.Mock).mockResolvedValue([{ name: 'Existing Project' }]);
    (prisma.project.findFirst as jest.Mock).mockResolvedValue({ order: 0 });
    (prisma.project.$transaction as jest.Mock).mockResolvedValue([
      { id: '1', name: 'New Project', userId: 'user1' },
    ]);

    const request = new NextRequest('http://localhost/api/projects/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projects: [
          { name: 'Existing Project', status: 'EN_COURS' },
          { name: 'New Project', status: 'EN_COURS' },
        ],
        overwriteDuplicates: false,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.data.created).toBe(1);
    expect(data.data.failed).toBe(1);
  });

  it('should validate project data', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    const request = new NextRequest('http://localhost/api/projects/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projects: [
          { name: '', status: 'EN_COURS' }, // Invalid: empty name
        ],
        overwriteDuplicates: false,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.failed).toBeGreaterThan(0);
    expect(data.data.errors.length).toBeGreaterThan(0);
  });

  it('should return 401 for unauthenticated user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/projects/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projects: [] }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non autorisé');
  });

  it('should enforce maximum 100 projects per batch', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    const largeBatch = Array.from({ length: 101 }, (_, i) => ({
      name: `Project ${i}`,
      status: 'EN_COURS',
    }));

    const request = new NextRequest('http://localhost/api/projects/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projects: largeBatch,
        overwriteDuplicates: false,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Maximum 100 projets');
  });
});
