/**
 * Tests for /api/users route
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
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/api/rateLimiter', () => ({
  rateLimit: jest.fn(() => null),
}));

jest.mock('@/lib/bcrypt-edge', () => ({
  hash: jest.fn((password: string) => Promise.resolve(`hashed_${password}`)),
}));

jest.mock('@/lib/api/webhooks', () => ({
  sendWebhook: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('/api/users', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return users for authenticated user', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user1', role: 'USER' },
      });

      const mockUsers = [
        {
          id: '1',
          name: 'User 1',
          email: 'user1@test.com',
          role: 'USER',
        },
        {
          id: '2',
          name: 'User 2',
          email: 'user2@test.com',
          role: 'ADMIN',
        },
      ];

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const request = new NextRequest('http://localhost/api/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual(mockUsers);
      expect(data.message).toBe('Utilisateurs récupérés');
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        orderBy: {
          email: 'asc',
        },
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');
      (auth as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Non autorisé');
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user1', role: 'USER' },
      });

      (prisma.user.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/users');
      const response = await GET(request);

      expect(response.status).toBe(500);
    });
  });

  describe('POST', () => {
    it('should create user for admin', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');
      const { hash } = await import('@/lib/bcrypt-edge');
      const { sendWebhook } = await import('@/lib/api/webhooks');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN', email: 'admin@test.com' },
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const newUser = {
        id: 'new-user-1',
        name: 'New User',
        email: 'newuser@test.com',
        role: 'USER',
        isVip: false,
      };

      (prisma.user.create as jest.Mock).mockResolvedValue(newUser);

      const request = new Request('http://localhost/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'newuser@test.com',
          name: 'New User',
          password: 'password123',
          role: 'USER',
          isVip: false,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data).toEqual(newUser);
      expect(data.message).toBe('Utilisateur créé avec succès');
      expect(hash).toHaveBeenCalledWith('password123', 10);
      expect(prisma.user.create).toHaveBeenCalled();
      expect(sendWebhook).toHaveBeenCalledWith(
        'user.created',
        expect.objectContaining({
          userId: newUser.id,
          email: newUser.email,
          role: newUser.role,
        }),
        expect.objectContaining({
          userId: 'admin1',
        })
      );
    });

    it('should return 403 for non-admin user', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user1', role: 'USER' },
      });

      const request = new Request('http://localhost/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'newuser@test.com',
          name: 'New User',
          password: 'password123',
          role: 'USER',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Non autorisé');
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should return 401 for unauthenticated user', async () => {
      const { auth } = await import('@/auth');
      (auth as jest.Mock).mockResolvedValue(null);

      const request = new Request('http://localhost/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'newuser@test.com',
          name: 'New User',
          password: 'password123',
          role: 'USER',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Non autorisé');
    });

    it('should return 409 if email already exists', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN', email: 'admin@test.com' },
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-user',
        email: 'existing@test.com',
      });

      const request = new Request('http://localhost/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'existing@test.com',
          name: 'New User',
          password: 'password123',
          role: 'USER',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Cet email est déjà utilisé');
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid JSON body', async () => {
      const { auth } = await import('@/auth');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
      });

      const request = new Request('http://localhost/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it('should return 400 for validation errors', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
      });

      const request = new Request('http://localhost/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
          password: '123', // Too short
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400); // handleApiError returns 400 for validation errors
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should handle rate limiting', async () => {
      const { rateLimit } = await import('@/lib/api/rateLimiter');
      const { auth } = await import('@/auth');

      (rateLimit as jest.Mock).mockResolvedValue(
        new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429 })
      );

      const request = new Request('http://localhost/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'newuser@test.com',
          name: 'New User',
          password: 'password123',
          role: 'USER',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Rate limit exceeded');
      expect(auth).not.toHaveBeenCalled();
    });

    it('should set isVip to false by default', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');
      const { rateLimit } = await import('@/lib/api/rateLimiter');

      // Ensure rateLimit returns null for this test
      (rateLimit as jest.Mock).mockResolvedValue(null);

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN', email: 'admin@test.com' },
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const newUser = {
        id: 'new-user-1',
        name: 'New User',
        email: 'newuser@test.com',
        role: 'USER',
        isVip: false,
      };

      (prisma.user.create as jest.Mock).mockResolvedValue(newUser);

      const request = new Request('http://localhost/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'newuser@test.com',
          name: 'New User',
          password: 'password123',
          role: 'USER',
          // isVip not provided
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      expect(prisma.user.create).toHaveBeenCalled();
      const createCall = (prisma.user.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.isVip).toBe(false);
    });
  });
});
