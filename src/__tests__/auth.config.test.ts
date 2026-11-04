// Mock next-auth providers before importing auth.config
jest.mock('next-auth/providers/google', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    id: 'google',
    name: 'Google',
  })),
}));

jest.mock('next-auth/providers/twitch', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    id: 'twitch',
    name: 'Twitch',
  })),
}));

// Mock prisma - must be a factory function to ensure it's called correctly
const mockPrisma = {
  account: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
}));

// jose et @panva/hkdf sont des modules ESM : on simule la création du jeton de fusion
jest.mock('@panva/hkdf', () => ({ hkdf: jest.fn(() => Promise.resolve(new Uint8Array(64))) }));
jest.mock('jose', () => {
  class EncryptJWT {
    setProtectedHeader() {
      return this;
    }
    setIssuedAt() {
      return this;
    }
    setExpirationTime() {
      return this;
    }
    encrypt() {
      return Promise.resolve('merge-token');
    }
  }
  return {
    EncryptJWT,
    base64url: { encode: jest.fn(() => 'k') },
    calculateJwkThumbprint: jest.fn(() => Promise.resolve('thumb')),
  };
});

import { authConfig } from '../auth.config';

describe('auth.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should have providers array', () => {
    expect(authConfig.providers).toBeDefined();
    expect(Array.isArray(authConfig.providers)).toBe(true);
  });

  it('should include Google provider if credentials are set', () => {
    process.env.GOOGLE_CLIENT_ID = 'test-google-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-google-secret';

    // Re-import to get fresh config
    jest.resetModules();
    const { authConfig: newConfig } = require('../auth.config');

    expect(newConfig.providers.length).toBeGreaterThan(0);
  });

  it('should include Twitch provider if credentials are set', () => {
    process.env.TWITCH_CLIENT_ID = 'test-twitch-id';
    process.env.TWITCH_CLIENT_SECRET = 'test-twitch-secret';

    // Re-import to get fresh config
    jest.resetModules();
    const { authConfig: newConfig } = require('../auth.config');

    expect(newConfig.providers.length).toBeGreaterThan(0);
  });

  it('should have callbacks defined', () => {
    expect(authConfig.callbacks).toBeDefined();
    expect(authConfig.callbacks.signIn).toBeDefined();
  });

  it('should handle signIn callback', async () => {
    // Reset and set up mocks
    (mockPrisma.account.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.user.create as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
    });
    (mockPrisma.account.create as jest.Mock).mockResolvedValue({ id: 'account-1' });

    const result = await authConfig.callbacks.signIn({
      user: { email: 'test@example.com', id: 'user-1' },
      account: {
        provider: 'google',
        providerAccountId: 'account-1',
        type: 'oauth',
      },
      profile: {},
    } as any);

    expect(typeof result).toBe('boolean');
  });

  it('should handle existing account in signIn', async () => {
    // Reset and set up mocks
    (mockPrisma.account.findUnique as jest.Mock).mockResolvedValue({
      id: 'account-1',
      user: { email: 'test@example.com', id: 'user-1' },
    });

    const result = await authConfig.callbacks.signIn({
      user: { email: 'test@example.com', id: 'user-1' },
      account: {
        provider: 'google',
        providerAccountId: 'account-1',
        type: 'oauth',
      },
      profile: {},
    } as any);

    expect(result).toBe(true);
  });

  it('should allow password logins for users without a credentials Account row', async () => {
    process.env.REQUIRE_MERGE_CONFIRMATION = 'true';
    (mockPrisma.account.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      Account: [{ provider: 'google' }],
    });

    const result = await authConfig.callbacks.signIn({
      user: { email: 'test@example.com', id: 'user-1' },
      account: {
        provider: 'credentials',
        providerAccountId: 'user-1',
        type: 'credentials',
      },
      profile: undefined,
    } as any);

    expect(result).toBe(true);
  });

  describe('fusion automatique (REQUIRE_MERGE_CONFIRMATION=false)', () => {
    const googleSignIn = () =>
      authConfig.callbacks.signIn({
        user: { email: 'victim@test.com', id: 'oauth-user', name: 'Victim' },
        account: {
          provider: 'google',
          providerAccountId: 'google-123',
          type: 'oauth',
        },
        profile: {},
      } as any);

    beforeEach(() => {
      process.env.REQUIRE_MERGE_CONFIRMATION = 'false';
      process.env.NEXTAUTH_SECRET = 'test-secret';
      (mockPrisma.account.findUnique as jest.Mock).mockResolvedValue(null);
    });

    it('ne fusionne jamais automatiquement un compte protégé par mot de passe', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'victim@test.com',
        hashedPassword: '$2a$12$hash',
        Account: [],
      });

      const result = await googleSignIn();

      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\/auth\/merge-accounts\?token=/);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('refuse la connexion si le jeton ne peut pas être créé (pas de secret)', async () => {
      delete process.env.NEXTAUTH_SECRET;
      delete process.env.AUTH_SECRET;
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'victim@test.com',
        hashedPassword: '$2a$12$hash',
        Account: [],
      });

      await expect(googleSignIn()).resolves.toBe(false);
    });

    it('garde la fusion automatique pour un compte sans mot de passe', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'victim@test.com',
        hashedPassword: null,
        name: null,
        image: null,
        Account: [{ provider: 'twitch' }],
      });

      const result = await googleSignIn();

      expect(result).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { name: 'Victim' },
      });
    });
  });
});

describe('auth.config jwt callback', () => {
  const jwt = authConfig.callbacks!.jwt as unknown as (args: {
    token: Record<string, unknown>;
    user?: Record<string, unknown>;
    trigger?: string;
    session?: unknown;
  }) => Promise<Record<string, unknown> | null>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ignores client data on update and reloads the user from the database', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user1',
      name: 'Alice',
      email: 'alice@test.com',
      image: null,
      role: 'USER',
      isVip: false,
      createdAt: new Date('2026-01-01'),
      gameHighScore: 10,
      hasDiscoveredCasino: false,
    });

    const result = await jwt({
      token: { id: 'user1', role: 'USER' },
      trigger: 'update',
      session: { user: { id: 'admin1', role: 'ADMIN', isVip: true, email: 'admin@test.com' } },
    });

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user1' } })
    );
    expect(result).toMatchObject({
      id: 'user1',
      role: 'USER',
      isVip: false,
      email: 'alice@test.com',
    });
  });

  it('refreshes the role from the database after 5 minutes', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ role: 'USER', isVip: false });

    const result = await jwt({
      token: { id: 'user1', role: 'ADMIN', roleCheckedAt: Date.now() - 6 * 60 * 1000 },
    });

    expect(result).toMatchObject({ role: 'USER' });
  });

  it('does not query the database when the role was checked recently', async () => {
    const result = await jwt({ token: { id: 'user1', role: 'ADMIN', roleCheckedAt: Date.now() } });

    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(result).toMatchObject({ role: 'ADMIN' });
  });

  it('ends the session when the account no longer exists', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const result = await jwt({ token: { id: 'gone', role: 'USER', roleCheckedAt: 0 } });

    expect(result).toBeNull();
  });
});
