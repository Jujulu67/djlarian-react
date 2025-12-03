/**
 * Tests for /api/admin/live/time-offset route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { GET, POST, DELETE } from '../route';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    adminSettings: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('/api/admin/live/time-offset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return time offset for admin user', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
      });

      (prisma.adminSettings.findUnique as jest.Mock).mockResolvedValue({
        key: 'timeOffsetMinutes',
        value: '30',
      });

      const request = new NextRequest('http://localhost/api/admin/live/time-offset');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(data.data.timeOffsetMinutes).toBe(30);
    });
  });

  describe('POST', () => {
    it('should update time offset for admin user', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
      });

      (prisma.adminSettings.findUnique as jest.Mock).mockResolvedValue({
        key: 'timeOffsetMinutes',
        value: '30',
      });

      (prisma.adminSettings.upsert as jest.Mock).mockResolvedValue({
        key: 'timeOffsetMinutes',
        value: '60',
      });

      const request = new NextRequest('http://localhost/api/admin/live/time-offset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ increment: 30 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
    });
  });

  describe('DELETE', () => {
    it('should reset time offset for admin user', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
      });

      (prisma.adminSettings.upsert as jest.Mock).mockResolvedValue({
        key: 'timeOffsetMinutes',
        value: '0',
      });

      const request = new NextRequest('http://localhost/api/admin/live/time-offset', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.timeOffsetMinutes).toBe(0);
    });
  });
});
