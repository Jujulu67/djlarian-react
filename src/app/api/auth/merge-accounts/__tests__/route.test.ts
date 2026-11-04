/**
 * Tests for POST /api/auth/merge-accounts
 * @jest-environment node
 */
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

import { rateLimit } from '@/lib/api/rateLimiter';
import prisma from '@/lib/prisma';

import { POST } from '../route';

jest.mock('@/lib/prisma', () => {
  const tx = { user: { update: jest.fn() }, account: { create: jest.fn() } };
  return {
    __esModule: true,
    default: {
      user: { findUnique: jest.fn() },
      $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
      __tx: tx,
    },
  };
});

jest.mock('@/lib/api/rateLimiter', () => ({
  rateLimit: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('@panva/hkdf', () => ({ hkdf: jest.fn(() => Promise.resolve(new Uint8Array(64))) }));

jest.mock('jose', () => ({
  jwtDecrypt: jest.fn(() =>
    Promise.resolve({
      payload: {
        email: 'victim@test.com',
        name: 'Victim',
        image: null,
        provider: 'google',
        providerAccountId: 'google-123',
        existingUserId: 'user-1',
        accountData: { type: 'oauth', access_token: 'at' },
      },
    })
  ),
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

const mockPrisma = prisma as unknown as {
  user: { findUnique: jest.Mock };
  $transaction: jest.Mock;
  __tx: { user: { update: jest.Mock }; account: { create: jest.Mock } };
};

const HASH = bcrypt.hashSync('bon-mot-de-passe', 4);

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/auth/merge-accounts', {
    method: 'POST',
    body: JSON.stringify({ token: 'jeton', options: {}, ...body }),
  });
}

describe('POST /api/auth/merge-accounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'test-secret';
  });

  const userWithPassword = { id: 'user-1', hashedPassword: HASH, Account: [] };

  it('applique le rate limiter à 5 par minute', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      hashedPassword: null,
      Account: [],
    });
    await POST(makeRequest({}));
    expect(rateLimit).toHaveBeenCalledWith(expect.any(NextRequest), 5);
  });

  it('refuse (403) la fusion sans mot de passe sur un compte qui en a un', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(userWithPassword);
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Mot de passe incorrect' });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('refuse (403) un mauvais mot de passe avec le même message', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(userWithPassword);
    const response = await POST(makeRequest({ password: 'faux' }));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Mot de passe incorrect' });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('fusionne avec le bon mot de passe', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(userWithPassword);
    const response = await POST(makeRequest({ password: 'bon-mot-de-passe' }));
    expect(response.status).toBe(200);
    expect(mockPrisma.__tx.account.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        provider: 'google',
        providerAccountId: 'google-123',
      }),
    });
  });

  it('fusionne sans mot de passe quand le compte existant n’en a pas', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      hashedPassword: null,
      Account: [],
    });
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(200);
    expect(mockPrisma.__tx.account.create).toHaveBeenCalledTimes(1);
  });

  it('renvoie la réponse du rate limiter quand la limite est atteinte', async () => {
    (rateLimit as jest.Mock).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Trop de requêtes' }), { status: 429 })
    );
    const response = await POST(makeRequest({ password: 'bon-mot-de-passe' }));
    expect(response.status).toBe(429);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });
});
