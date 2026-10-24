/**
 * Tests for /api/users/[userId] route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { PUT, DELETE, GET, POST, PATCH } from '../route';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/lib/bcrypt-edge', () => ({
  hash: jest.fn((password: string) => Promise.resolve(`hashed_${password}`)),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

describe('/api/users/[userId]', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'admin1', role: 'ADMIN' } });
  });

  describe('authorization', () => {
    const putRequest = (body: object) =>
      new Request('http://localhost/api/users/user1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

    it('should reject PUT without session', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');
      (auth as jest.Mock).mockResolvedValue(null);

      const response = await PUT(putRequest({ role: 'ADMIN' }), {
        params: Promise.resolve({ userId: 'user1' }),
      });

      expect(response.status).toBe(401);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("should reject PUT on another user's account for non-admin", async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');
      (auth as jest.Mock).mockResolvedValue({ user: { id: 'user2', role: 'USER' } });

      const response = await PUT(putRequest({ name: 'Hacked' }), {
        params: Promise.resolve({ userId: 'user1' }),
      });

      expect(response.status).toBe(401);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should forbid a user from changing their own role or VIP status', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');
      (auth as jest.Mock).mockResolvedValue({ user: { id: 'user1', role: 'USER' } });

      const response = await PUT(putRequest({ role: 'ADMIN', isVip: true }), {
        params: Promise.resolve({ userId: 'user1' }),
      });

      expect(response.status).toBe(403);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should let a user update their own name without exposing the password hash', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');
      (auth as jest.Mock).mockResolvedValue({ user: { id: 'user1', role: 'USER' } });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user1' });
      (prisma.user.update as jest.Mock).mockResolvedValue({
        id: 'user1',
        name: 'New',
        hashedPassword: 'secret-hash',
      });

      const response = await PUT(putRequest({ name: 'New' }), {
        params: Promise.resolve({ userId: 'user1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ id: 'user1', name: 'New' });
    });

    it("should reject DELETE of another user's account for non-admin", async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');
      (auth as jest.Mock).mockResolvedValue({ user: { id: 'user2', role: 'USER' } });

      const request = new Request('http://localhost/api/users/user1', { method: 'DELETE' });
      const response = await DELETE(request, { params: Promise.resolve({ userId: 'user1' }) });

      expect(response.status).toBe(401);
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });
  });

  describe('PUT', () => {
    it('should update user successfully', async () => {
      const { default: prisma } = await import('@/lib/prisma');
      const { hash } = await import('@/lib/bcrypt-edge');

      const existingUser = {
        id: 'user1',
        email: 'old@test.com',
        name: 'Old Name',
        role: 'USER',
        isVip: false,
      };

      const updatedUser = {
        ...existingUser,
        email: 'new@test.com',
        name: 'New Name',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(updatedUser);

      const request = new Request('http://localhost/api/users/user1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'new@test.com',
          name: 'New Name',
        }),
      });

      const response = await PUT(request, { params: Promise.resolve({ userId: 'user1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(updatedUser);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user1' },
        data: {
          email: 'new@test.com',
          name: 'New Name',
        },
      });
    });

    it('should update password when provided', async () => {
      const { default: prisma } = await import('@/lib/prisma');
      const { hash } = await import('@/lib/bcrypt-edge');

      const existingUser = {
        id: 'user1',
        email: 'user@test.com',
        name: 'User',
        role: 'USER',
        isVip: false,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(existingUser);

      const request = new Request('http://localhost/api/users/user1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: 'newpassword123',
        }),
      });

      await PUT(request, { params: Promise.resolve({ userId: 'user1' }) });

      expect(hash).toHaveBeenCalledWith('newpassword123', 10);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user1' },
        data: expect.objectContaining({
          hashedPassword: 'hashed_newpassword123',
        }),
      });
    });

    it('should return 400 if userId is missing', async () => {
      const request = new Request('http://localhost/api/users/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'new@test.com' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ userId: '' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('ID utilisateur manquant.');
    });

    it('should return 400 for invalid JSON', async () => {
      const request = new Request('http://localhost/api/users/user1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      const response = await PUT(request, { params: Promise.resolve({ userId: 'user1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Requête invalide (JSON mal formé).');
    });

    it('should return 400 for validation errors', async () => {
      const request = new Request('http://localhost/api/users/user1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
          password: '123', // Too short
        }),
      });

      const response = await PUT(request, { params: Promise.resolve({ userId: 'user1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Données invalides.');
      expect(data.details).toBeDefined();
    });

    it('should return 400 if no data to update', async () => {
      const { default: prisma } = await import('@/lib/prisma');

      const existingUser = {
        id: 'user1',
        email: 'user@test.com',
        name: 'User',
        role: 'USER',
        isVip: false,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);

      const request = new Request('http://localhost/api/users/user1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await PUT(request, { params: Promise.resolve({ userId: 'user1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Aucune donnée à mettre à jour fournie.');
    });

    it('should return 404 if user not found', async () => {
      const { default: prisma } = await import('@/lib/prisma');

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request('http://localhost/api/users/user1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'new@test.com' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ userId: 'user1' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Utilisateur non trouvé.');
    });

    it('should return 409 if email already exists', async () => {
      const { default: prisma } = await import('@/lib/prisma');

      const existingUser = {
        id: 'user1',
        email: 'old@test.com',
        name: 'User',
        role: 'USER',
        isVip: false,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);
      (prisma.user.update as jest.Mock).mockRejectedValue({
        code: 'P2002',
        meta: { target: ['email'] },
      });

      const request = new Request('http://localhost/api/users/user1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'existing@test.com' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ userId: 'user1' }) });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Cet email est déjà utilisé par un autre compte.');
    });

    it('should return 500 for hash errors', async () => {
      const { default: prisma } = await import('@/lib/prisma');
      const { hash } = await import('@/lib/bcrypt-edge');

      const existingUser = {
        id: 'user1',
        email: 'user@test.com',
        name: 'User',
        role: 'USER',
        isVip: false,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);
      (hash as jest.Mock).mockRejectedValue(new Error('Hash error'));

      const request = new Request('http://localhost/api/users/user1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'newpassword123' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ userId: 'user1' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Erreur interne lors de la préparation des données.');
    });

    it('should update isVip field', async () => {
      const { default: prisma } = await import('@/lib/prisma');

      const existingUser = {
        id: 'user1',
        email: 'user@test.com',
        name: 'User',
        role: 'USER',
        isVip: false,
      };

      const updatedUser = { ...existingUser, isVip: true };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(updatedUser);

      const request = new Request('http://localhost/api/users/user1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVip: true }),
      });

      await PUT(request, { params: Promise.resolve({ userId: 'user1' }) });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user1' },
        data: expect.objectContaining({
          isVip: true,
        }),
      });
    });
  });

  describe('DELETE', () => {
    it('should delete user successfully', async () => {
      const { default: prisma } = await import('@/lib/prisma');

      const existingUser = {
        id: 'user1',
        email: 'user@test.com',
        name: 'User',
        role: 'USER',
        isVip: false,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);
      (prisma.user.delete as jest.Mock).mockResolvedValue(existingUser);

      const request = new Request('http://localhost/api/users/user1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ userId: 'user1' }) });

      expect(response.status).toBe(204);
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user1' },
      });
    });

    it('should return 400 if userId is missing', async () => {
      const request = new Request('http://localhost/api/users/', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ userId: '' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('ID utilisateur manquant.');
    });

    it('should return 404 if user not found', async () => {
      const { default: prisma } = await import('@/lib/prisma');

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request('http://localhost/api/users/user1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ userId: 'user1' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Utilisateur non trouvé.');
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    it('should return 409 for constraint violations', async () => {
      const { default: prisma } = await import('@/lib/prisma');

      const existingUser = {
        id: 'user1',
        email: 'user@test.com',
        name: 'User',
        role: 'USER',
        isVip: false,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);
      (prisma.user.delete as jest.Mock).mockRejectedValue({
        code: 'P2014',
      });

      const request = new Request('http://localhost/api/users/user1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ userId: 'user1' }) });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('Impossible de supprimer cet utilisateur');
    });

    it('should return 500 for other errors', async () => {
      const { default: prisma } = await import('@/lib/prisma');

      const existingUser = {
        id: 'user1',
        email: 'user@test.com',
        name: 'User',
        role: 'USER',
        isVip: false,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);
      (prisma.user.delete as jest.Mock).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/users/user1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ userId: 'user1' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Erreur interne du serveur lors de la suppression.');
    });
  });

  describe('GET, POST, PATCH', () => {
    it('should return 400 for GET', async () => {
      const request = new Request('http://localhost/api/users/user1', {
        method: 'GET',
      });

      const response = await GET(request, { params: Promise.resolve({ userId: 'user1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Requête non gérée');
    });

    it('should return 400 for POST', async () => {
      const request = new Request('http://localhost/api/users/user1', {
        method: 'POST',
      });

      const response = await POST(request, { params: Promise.resolve({ userId: 'user1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Requête non gérée');
    });

    it('should return 400 for PATCH', async () => {
      const request = new Request('http://localhost/api/users/user1', {
        method: 'PATCH',
      });

      const response = await PATCH(request, { params: Promise.resolve({ userId: 'user1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Requête non gérée');
    });
  });
});
