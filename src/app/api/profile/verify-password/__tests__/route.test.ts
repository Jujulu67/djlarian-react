/**
 * Tests for /api/profile/verify-password route
 * @jest-environment node
 */
import { POST } from '../route';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { compare as bcryptCompare } from '@/lib/bcrypt-edge';
import { logger } from '@/lib/logger';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/bcrypt-edge', () => ({
  compare: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('/api/profile/verify-password', () => {
  const mockAuth = auth as jest.MockedFunction<typeof auth>;
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;
  const mockBcryptCompare = bcryptCompare as jest.MockedFunction<typeof bcryptCompare>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should verify password successfully', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
    } as any);

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      hashedPassword: 'hashed-password',
    } as any);

    mockBcryptCompare.mockResolvedValue(true);

    const request = new Request('http://localhost/api/profile/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'correct-password' }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockBcryptCompare).toHaveBeenCalledWith('correct-password', 'hashed-password');
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("Mot de passe vérifié pour l'utilisateur user-1")
    );
  });

  it('should return 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request('http://localhost/api/profile/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'password' }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non authentifié');
    expect(mockBcryptCompare).not.toHaveBeenCalled();
  });

  it('should return 401 when session has no user id', async () => {
    mockAuth.mockResolvedValue({
      user: { email: 'test@example.com' },
    } as any);

    const request = new Request('http://localhost/api/profile/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'password' }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non authentifié');
  });

  it('should return 400 when password is missing', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
    } as any);

    const request = new Request('http://localhost/api/profile/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Mot de passe requis');
  });

  it('should return 400 when user has no password', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
    } as any);

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      hashedPassword: null,
    } as any);

    const request = new Request('http://localhost/api/profile/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'password' }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Aucun mot de passe défini');
  });

  it('should return 400 when user is not found', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
    } as any);

    mockPrisma.user.findUnique.mockResolvedValue(null);

    const request = new Request('http://localhost/api/profile/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'password' }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Aucun mot de passe défini');
  });

  it('should return 401 when password is incorrect', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
    } as any);

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      hashedPassword: 'hashed-password',
    } as any);

    mockBcryptCompare.mockResolvedValue(false);

    const request = new Request('http://localhost/api/profile/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'wrong-password' }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Mot de passe incorrect');
    expect(mockBcryptCompare).toHaveBeenCalledWith('wrong-password', 'hashed-password');
  });

  it('should handle database errors', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
    } as any);

    mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

    const request = new Request('http://localhost/api/profile/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'password' }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Erreur lors de la vérification du mot de passe');
    expect(logger.error).toHaveBeenCalled();
  });

  it('should handle bcrypt compare errors', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
    } as any);

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      hashedPassword: 'hashed-password',
    } as any);

    mockBcryptCompare.mockRejectedValue(new Error('Bcrypt error'));

    const request = new Request('http://localhost/api/profile/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'password' }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Erreur lors de la vérification du mot de passe');
    expect(logger.error).toHaveBeenCalled();
  });

  it('should handle invalid JSON body', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
    } as any);

    const request = new Request('http://localhost/api/profile/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json',
    });

    const response = await POST(request as any);

    expect(response.status).toBe(500);
    expect(logger.error).toHaveBeenCalled();
  });
});
