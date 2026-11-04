/**
 * Tests for /api/auth/register route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { rateLimit } from '@/lib/api/rateLimiter';

import { POST } from '../route';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/api/rateLimiter', () => ({
  rateLimit: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('@/lib/bcrypt-edge', () => ({
  hash: jest.fn((password: string) => Promise.resolve(`hashed_${password}`)),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock console methods
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});

describe('/api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should register a new user successfully', async () => {
    const { default: prisma } = await import('@/lib/prisma');
    const { hash } = await import('@/lib/bcrypt-edge');

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'new-user-1',
      email: 'newuser@test.com',
      name: 'New User',
    });

    const request = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'newuser@test.com',
        name: 'New User',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.message).toBe('Utilisateur créé avec succès');
    expect(hash).toHaveBeenCalledWith('password123', 12);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'newuser@test.com',
        name: 'New User',
        hashedPassword: 'hashed_password123',
      },
    });
  });

  it('should return 400 if email is missing', async () => {
    const { default: prisma } = await import('@/lib/prisma');

    const request = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'New User',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Adresse email invalide');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('should register without a name (optional)', async () => {
    const { default: prisma } = await import('@/lib/prisma');
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({ id: 'new-user-2' });

    const request = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'newuser@test.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'newuser@test.com',
        name: undefined,
        hashedPassword: 'hashed_password123',
      },
    });
  });

  it('should return 400 if password is missing', async () => {
    const request = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'newuser@test.com',
        name: 'New User',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Le mot de passe est requis');
  });

  it('should return 400 if email already exists', async () => {
    const { default: prisma } = await import('@/lib/prisma');

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'existing-user',
      email: 'existing@test.com',
    });

    const request = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'existing@test.com',
        name: 'New User',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Cet email est déjà utilisé');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('should handle database errors', async () => {
    const { default: prisma } = await import('@/lib/prisma');
    const { logger } = await import('@/lib/logger');

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'newuser@test.com',
        name: 'New User',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Une erreur est survenue lors de l'inscription");
    expect(logger.error).toHaveBeenCalled();
  });

  it('should reject invalid JSON with 400', async () => {
    const { default: prisma } = await import('@/lib/prisma');

    const request = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Données invalides');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  const post = (body: Record<string, unknown>) =>
    POST(
      new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    );

  it.each([
    [
      'an invalid email',
      { email: 'not-an-email', password: 'password123' },
      'Adresse email invalide',
    ],
    [
      'a password shorter than 8 characters',
      { email: 'a@test.com', password: '1234567' },
      'Le mot de passe doit contenir au moins 8 caractères',
    ],
    [
      'a password longer than 128 characters',
      { email: 'a@test.com', password: 'x'.repeat(129) },
      'Le mot de passe ne peut pas dépasser 128 caractères',
    ],
    [
      'a name longer than 100 characters',
      { email: 'a@test.com', password: 'password123', name: 'n'.repeat(101) },
      'Le nom ne peut pas dépasser 100 caractères',
    ],
    [
      'a non-string password',
      { email: 'a@test.com', password: 12345678 },
      'Le mot de passe est requis',
    ],
  ])('should return 400 for %s', async (_label, body, message) => {
    const { default: prisma } = await import('@/lib/prisma');

    const response = await post(body);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe(message);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('should accept boundary lengths (8 and 128 characters, name of 100)', async () => {
    const { default: prisma } = await import('@/lib/prisma');
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({ id: 'u' });

    expect((await post({ email: 'a@test.com', password: '12345678' })).status).toBe(201);
    expect(
      (await post({ email: 'b@test.com', password: 'x'.repeat(128), name: 'n'.repeat(100) })).status
    ).toBe(201);
  });

  it('should apply a low rate limit (5/min) and stop before touching the database', async () => {
    const { default: prisma } = await import('@/lib/prisma');
    const { NextResponse } = await import('next/server');
    (rateLimit as jest.Mock).mockResolvedValueOnce(
      NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    );

    const response = await post({ email: 'a@test.com', password: 'password123' });

    expect(response.status).toBe(429);
    expect(rateLimit).toHaveBeenCalledWith(expect.anything(), 5);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
