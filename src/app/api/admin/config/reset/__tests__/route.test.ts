/**
 * Tests for /api/admin/config/reset route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { POST } from '../route';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    configSnapshot: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/config/defaults', () => ({
  defaultConfigs: {
    general: {
      siteName: 'Test Site',
      siteDescription: 'Test Description',
    },
  },
}));

jest.mock('@/lib/utils/arrayHelpers', () => ({
  isNotEmpty: jest.fn((arr) => Array.isArray(arr) && arr.length > 0),
}));

describe('/api/admin/config/reset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reset configs for admin user', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'ADMIN', email: 'admin@test.com' },
    });

    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ id: 'config1', value: 'old value' }]);

    (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);
    (prisma.configSnapshot.create as jest.Mock).mockResolvedValue({ id: 'snapshot1' });

    const request = new NextRequest('http://localhost/api/admin/config/reset', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should return 401 for non-admin user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    const request = new NextRequest('http://localhost/api/admin/config/reset', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non autorisé');
  });

  it('should handle errors', async () => {
    const { auth } = await import('@/auth');
    const { logger } = await import('@/lib/logger');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'ADMIN' },
    });

    const { default: prisma } = await import('@/lib/prisma');
    (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/admin/config/reset', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Erreur serveur');
    expect(logger.error).toHaveBeenCalled();
  });
});
