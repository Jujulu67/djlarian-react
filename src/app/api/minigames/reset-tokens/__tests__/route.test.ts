/**
 * Tests for /api/minigames/reset-tokens route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { POST } from '../route';

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    userSlotMachineTokens: {
      upsert: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), debug: jest.fn(), warn: jest.fn() },
}));

const request = () =>
  new NextRequest('http://localhost/api/minigames/reset-tokens', { method: 'POST' });

describe('/api/minigames/reset-tokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 for a visitor', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(prisma.userSlotMachineTokens.upsert).not.toHaveBeenCalled();
  });

  it('should return 403 for a non-admin user', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user1', role: 'USER' } });

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(prisma.userSlotMachineTokens.upsert).not.toHaveBeenCalled();
  });

  it("should reset the admin's tokens", async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'admin1', role: 'ADMIN' } });
    (prisma.userSlotMachineTokens.upsert as jest.Mock).mockResolvedValue({
      userId: 'admin1',
      tokens: 100,
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(prisma.userSlotMachineTokens.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'admin1' } })
    );
  });
});
