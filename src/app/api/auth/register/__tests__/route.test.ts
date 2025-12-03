/**
 * Tests for /api/auth/register route
 * @jest-environment node
 */
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

jest.mock('@/lib/bcrypt-edge', () => ({
  hash: jest.fn((password: string) => Promise.resolve(`hashed_${password}`)),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
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

    const request = new Request('http://localhost/api/auth/register', {
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

    const request = new Request('http://localhost/api/auth/register', {
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
    expect(data.error).toBe('Tous les champs sont requis');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('should return 400 if name is missing', async () => {
    const request = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'newuser@test.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Tous les champs sont requis');
  });

  it('should return 400 if password is missing', async () => {
    const request = new Request('http://localhost/api/auth/register', {
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
    expect(data.error).toBe('Tous les champs sont requis');
  });

  it('should return 400 if email already exists', async () => {
    const { default: prisma } = await import('@/lib/prisma');

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'existing-user',
      email: 'existing@test.com',
    });

    const request = new Request('http://localhost/api/auth/register', {
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

    const request = new Request('http://localhost/api/auth/register', {
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

  it('should handle invalid JSON', async () => {
    const { logger } = await import('@/lib/logger');

    const request = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Une erreur est survenue lors de l'inscription");
    expect(logger.error).toHaveBeenCalled();
  });
});
