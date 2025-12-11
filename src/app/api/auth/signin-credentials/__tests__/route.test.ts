/**
 * Tests for /api/auth/signin-credentials route
 * @jest-environment node
 */
import { POST } from '../route';

// Mock dependencies
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

jest.mock('@panva/hkdf', () => ({
  hkdf: jest.fn(() => Promise.resolve(new Uint8Array(64))),
}));

jest.mock('jose', () => ({
  EncryptJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    setJti: jest.fn().mockReturnThis(),
    encrypt: jest.fn(() => Promise.resolve('encrypted-token')),
  })),
  base64url: {
    encode: jest.fn((data: Uint8Array) => 'base64-encoded'),
  },
  calculateJwkThumbprint: jest.fn(() => Promise.resolve('thumbprint')),
}));

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'test-uuid'),
  },
});

// Mock console methods
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
  process.env.NEXTAUTH_SECRET = 'test-secret';
  process.env.NODE_ENV = 'test';
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
  delete process.env.NEXTAUTH_SECRET;
  delete process.env.NODE_ENV;
});

describe('/api/auth/signin-credentials', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should sign in user with valid credentials', async () => {
    const { default: prisma } = await import('@/lib/prisma');
    const { compare } = await import('@/lib/bcrypt-edge');

    const user = {
      id: 'user1',
      email: 'user@test.com',
      name: 'Test User',
      hashedPassword: 'hashed_password',
      role: 'USER',
      image: 'https://example.com/avatar.jpg',
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
    (compare as jest.Mock).mockResolvedValue(true);

    const request = new Request('http://localhost/api/auth/signin-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@test.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.user).toEqual({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
    });
    expect(compare).toHaveBeenCalledWith('password123', 'hashed_password');
    expect(response.cookies.get('authjs.session-token')).toBeDefined();
  });

  it('should return 400 if email is missing', async () => {
    const request = new Request('http://localhost/api/auth/signin-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Email et mot de passe requis');
  });

  it('should return 400 if password is missing', async () => {
    const request = new Request('http://localhost/api/auth/signin-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@test.com',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Email et mot de passe requis');
  });

  it('should return 401 if user not found', async () => {
    const { default: prisma } = await import('@/lib/prisma');

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new Request('http://localhost/api/auth/signin-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent@test.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('CredentialsSignin');
  });

  it('should return 401 if user has no password', async () => {
    const { default: prisma } = await import('@/lib/prisma');

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user1',
      email: 'user@test.com',
      hashedPassword: null,
    });

    const request = new Request('http://localhost/api/auth/signin-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@test.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('CredentialsSignin');
  });

  it('should return 401 if password is invalid', async () => {
    const { default: prisma } = await import('@/lib/prisma');
    const { compare } = await import('@/lib/bcrypt-edge');

    const user = {
      id: 'user1',
      email: 'user@test.com',
      name: 'Test User',
      hashedPassword: 'hashed_password',
      role: 'USER',
      image: null,
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
    (compare as jest.Mock).mockResolvedValue(false);

    const request = new Request('http://localhost/api/auth/signin-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@test.com',
        password: 'wrongpassword',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('CredentialsSignin');
  });

  it('should return 500 if NEXTAUTH_SECRET is not defined', async () => {
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.AUTH_SECRET;

    const { default: prisma } = await import('@/lib/prisma');
    const { compare } = await import('@/lib/bcrypt-edge');

    const user = {
      id: 'user1',
      email: 'user@test.com',
      name: 'Test User',
      hashedPassword: 'hashed_password',
      role: 'USER',
      image: null,
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
    (compare as jest.Mock).mockResolvedValue(true);

    const request = new Request('http://localhost/api/auth/signin-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@test.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Configuration error');

    // Restore for other tests
    process.env.NEXTAUTH_SECRET = 'test-secret';
  });

  it('should handle errors gracefully', async () => {
    const { default: prisma } = await import('@/lib/prisma');

    (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = new Request('http://localhost/api/auth/signin-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@test.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Database error');
  });

  it('should set secure cookie in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXTAUTH_SECRET = 'test-secret';

    const { default: prisma } = await import('@/lib/prisma');
    const { compare } = await import('@/lib/bcrypt-edge');

    const user = {
      id: 'user1',
      email: 'user@test.com',
      name: 'Test User',
      hashedPassword: 'hashed_password',
      role: 'USER',
      image: null,
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
    (compare as jest.Mock).mockResolvedValue(true);

    const request = new Request('http://localhost/api/auth/signin-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@test.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);

    expect(response.cookies.get('__Secure-authjs.session-token')).toBeDefined();

    // Restore
    process.env.NODE_ENV = 'test';
  });

  it('should use AUTH_SECRET as fallback if NEXTAUTH_SECRET is not defined', async () => {
    delete process.env.NEXTAUTH_SECRET;
    process.env.AUTH_SECRET = 'fallback-secret';

    const { default: prisma } = await import('@/lib/prisma');
    const { compare } = await import('@/lib/bcrypt-edge');

    const user = {
      id: 'user1',
      email: 'user@test.com',
      name: 'Test User',
      hashedPassword: 'hashed_password',
      role: 'USER',
      image: null,
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
    (compare as jest.Mock).mockResolvedValue(true);

    const request = new Request('http://localhost/api/auth/signin-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@test.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // Restore
    delete process.env.AUTH_SECRET;
    process.env.NEXTAUTH_SECRET = 'test-secret';
  });

  it('should handle ADMIN role correctly', async () => {
    const { default: prisma } = await import('@/lib/prisma');
    const { compare } = await import('@/lib/bcrypt-edge');

    const adminUser = {
      id: 'admin1',
      email: 'admin@test.com',
      name: 'Admin User',
      hashedPassword: 'hashed_password',
      role: 'ADMIN',
      image: 'https://example.com/admin.jpg',
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(adminUser);
    (compare as jest.Mock).mockResolvedValue(true);

    const request = new Request('http://localhost/api/auth/signin-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@test.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.role).toBe('ADMIN');
  });

  it('should handle user with null image', async () => {
    const { default: prisma } = await import('@/lib/prisma');
    const { compare } = await import('@/lib/bcrypt-edge');

    const user = {
      id: 'user1',
      email: 'user@test.com',
      name: 'Test User',
      hashedPassword: 'hashed_password',
      role: 'USER',
      image: null,
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
    (compare as jest.Mock).mockResolvedValue(true);

    const request = new Request('http://localhost/api/auth/signin-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@test.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.image).toBeNull();
  });

  it('should set correct cookie properties', async () => {
    const { default: prisma } = await import('@/lib/prisma');
    const { compare } = await import('@/lib/bcrypt-edge');

    const user = {
      id: 'user1',
      email: 'user@test.com',
      name: 'Test User',
      hashedPassword: 'hashed_password',
      role: 'USER',
      image: null,
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
    (compare as jest.Mock).mockResolvedValue(true);

    const request = new Request('http://localhost/api/auth/signin-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@test.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const cookie = response.cookies.get('authjs.session-token');

    expect(cookie).toBeDefined();
    expect(cookie?.value).toBe('encrypted-token');
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('lax');
    expect(cookie?.path).toBe('/');
    expect(cookie?.maxAge).toBe(30 * 24 * 60 * 60); // 30 days
  });

  it('should set secure cookie property in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXTAUTH_SECRET = 'test-secret';

    const { default: prisma } = await import('@/lib/prisma');
    const { compare } = await import('@/lib/bcrypt-edge');

    const user = {
      id: 'user1',
      email: 'user@test.com',
      name: 'Test User',
      hashedPassword: 'hashed_password',
      role: 'USER',
      image: null,
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
    (compare as jest.Mock).mockResolvedValue(true);

    const request = new Request('http://localhost/api/auth/signin-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@test.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const cookie = response.cookies.get('__Secure-authjs.session-token');

    expect(cookie).toBeDefined();
    expect(cookie?.secure).toBe(true);

    // Restore
    process.env.NODE_ENV = 'test';
  });

  it('should handle invalid JSON body', async () => {
    const request = new Request('http://localhost/api/auth/signin-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });

  it('should handle empty body', async () => {
    const request = new Request('http://localhost/api/auth/signin-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });

  it('should handle email as empty string', async () => {
    const request = new Request('http://localhost/api/auth/signin-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: '',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Email et mot de passe requis');
  });

  it('should handle password as empty string', async () => {
    const request = new Request('http://localhost/api/auth/signin-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@test.com',
        password: '',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Email et mot de passe requis');
  });

  it('should handle bcrypt compare error', async () => {
    const { default: prisma } = await import('@/lib/prisma');
    const { compare } = await import('@/lib/bcrypt-edge');

    const user = {
      id: 'user1',
      email: 'user@test.com',
      name: 'Test User',
      hashedPassword: 'hashed_password',
      role: 'USER',
      image: null,
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
    (compare as jest.Mock).mockRejectedValue(new Error('Bcrypt error'));

    const request = new Request('http://localhost/api/auth/signin-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@test.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Bcrypt error');
  });

  it('should handle hkdf error', async () => {
    const { default: prisma } = await import('@/lib/prisma');
    const { compare } = await import('@/lib/bcrypt-edge');
    const { hkdf } = await import('@panva/hkdf');

    const user = {
      id: 'user1',
      email: 'user@test.com',
      name: 'Test User',
      hashedPassword: 'hashed_password',
      role: 'USER',
      image: null,
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
    (compare as jest.Mock).mockResolvedValue(true);
    (hkdf as jest.Mock).mockRejectedValue(new Error('HKDF error'));

    const request = new Request('http://localhost/api/auth/signin-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@test.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('HKDF error');
  });

  it('should handle jose EncryptJWT error', async () => {
    const { default: prisma } = await import('@/lib/prisma');
    const { compare } = await import('@/lib/bcrypt-edge');
    const jose = await import('jose');
    const { hkdf } = await import('@panva/hkdf');

    const user = {
      id: 'user1',
      email: 'user@test.com',
      name: 'Test User',
      hashedPassword: 'hashed_password',
      role: 'USER',
      image: null,
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
    (compare as jest.Mock).mockResolvedValue(true);
    (hkdf as jest.Mock).mockResolvedValue(new Uint8Array(64)); // hkdf must succeed first

    const mockEncryptJWT = {
      setProtectedHeader: jest.fn().mockReturnThis(),
      setIssuedAt: jest.fn().mockReturnThis(),
      setExpirationTime: jest.fn().mockReturnThis(),
      setJti: jest.fn().mockReturnThis(),
      encrypt: jest.fn().mockRejectedValue(new Error('JWE encryption error')),
    };

    (jose.EncryptJWT as jest.Mock).mockImplementation(() => mockEncryptJWT);

    const request = new Request('http://localhost/api/auth/signin-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@test.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('JWE encryption error');

    // Restore mock
    (jose.EncryptJWT as jest.Mock).mockImplementation(() => ({
      setProtectedHeader: jest.fn().mockReturnThis(),
      setIssuedAt: jest.fn().mockReturnThis(),
      setExpirationTime: jest.fn().mockReturnThis(),
      setJti: jest.fn().mockReturnThis(),
      encrypt: jest.fn(() => Promise.resolve('encrypted-token')),
    }));
  });

  it('should call jose methods with correct parameters', async () => {
    const { default: prisma } = await import('@/lib/prisma');
    const { compare } = await import('@/lib/bcrypt-edge');
    const jose = await import('jose');
    const { hkdf } = await import('@panva/hkdf');

    const user = {
      id: 'user1',
      email: 'user@test.com',
      name: 'Test User',
      hashedPassword: 'hashed_password',
      role: 'USER',
      image: 'https://example.com/avatar.jpg',
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
    (compare as jest.Mock).mockResolvedValue(true);
    (hkdf as jest.Mock).mockResolvedValue(new Uint8Array(64));

    const mockEncryptJWT = {
      setProtectedHeader: jest.fn().mockReturnThis(),
      setIssuedAt: jest.fn().mockReturnThis(),
      setExpirationTime: jest.fn().mockReturnThis(),
      setJti: jest.fn().mockReturnThis(),
      encrypt: jest.fn(() => Promise.resolve('encrypted-token')),
    };

    // Clear previous mocks
    jest.clearAllMocks();

    (jose.EncryptJWT as jest.Mock).mockImplementation(() => mockEncryptJWT);

    const request = new Request('http://localhost/api/auth/signin-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@test.com',
        password: 'password123',
      }),
    });

    await POST(request);

    // Verify hkdf was called with correct parameters
    expect(hkdf).toHaveBeenCalledWith(
      'sha256',
      'test-secret',
      'authjs.session-token',
      'Auth.js Generated Encryption Key (authjs.session-token)',
      64
    );

    // Verify EncryptJWT was called
    expect(jose.EncryptJWT).toHaveBeenCalledWith({
      name: user.name,
      email: user.email,
      picture: user.image,
      sub: user.id,
      id: user.id,
      role: user.role,
    });

    // Verify setProtectedHeader was called
    expect(mockEncryptJWT.setProtectedHeader).toHaveBeenCalledWith({
      alg: 'dir',
      enc: 'A256CBC-HS512',
      kid: 'thumbprint',
    });

    // Verify base64url.encode was called
    expect(jose.base64url.encode).toHaveBeenCalled();

    // Verify calculateJwkThumbprint was called
    expect(jose.calculateJwkThumbprint).toHaveBeenCalled();
  });

  it('should handle unknown error type', async () => {
    const { default: prisma } = await import('@/lib/prisma');

    (prisma.user.findUnique as jest.Mock).mockRejectedValue('String error');

    const request = new Request('http://localhost/api/auth/signin-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@test.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Erreur inconnue');
  });
});
