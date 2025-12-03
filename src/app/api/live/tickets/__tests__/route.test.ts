/**
 * Tests for /api/live/tickets route
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
    userTicket: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('/api/live/tickets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return active tickets for authenticated user', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user1', role: 'USER' },
      });

      const mockTickets = [
        {
          id: 'ticket1',
          userId: 'user1',
          quantity: 10,
          source: 'MANUAL',
          expiresAt: null,
        },
      ];

      (prisma.userTicket.findMany as jest.Mock).mockResolvedValue(mockTickets);

      const request = new NextRequest('http://localhost/api/live/tickets');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual(mockTickets);
      expect(data.message).toBe('Tickets récupérés');
    });

    it('should return 401 for unauthenticated user', async () => {
      const { auth } = await import('@/auth');
      (auth as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/live/tickets');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Non authentifié');
    });
  });

  describe('POST', () => {
    it('should create ticket for admin', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'ADMIN' });

      const newTicket = {
        id: 'new-ticket-1',
        userId: 'admin1',
        quantity: 10,
        source: 'MANUAL',
        expiresAt: null,
      };

      (prisma.userTicket.create as jest.Mock).mockResolvedValue(newTicket);

      const request = new NextRequest('http://localhost/api/live/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: 10,
          source: 'MANUAL',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data).toEqual(newTicket);
      expect(data.message).toBe('Ticket créé avec succès');
    });

    it('should return 403 for non-admin', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user1', role: 'USER' },
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'USER' });

      const request = new NextRequest('http://localhost/api/live/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: 10,
          source: 'MANUAL',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Non autorisé');
    });

    it('should return 400 for validation errors', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'ADMIN' });

      const request = new NextRequest('http://localhost/api/live/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: -1, // Invalid
          source: 'MANUAL',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Données invalides');
    });
  });
});
