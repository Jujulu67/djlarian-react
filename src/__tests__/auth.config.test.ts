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

// Mock merge-token-cache
jest.mock('@/lib/merge-token-cache', () => ({
  storeMergeToken: jest.fn(),
}));

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
});
