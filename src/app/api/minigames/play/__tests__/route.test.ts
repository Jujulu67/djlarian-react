/**
 * Tests for POST /api/minigames/play
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { POST } from '../route';
import * as random from '@/lib/utils/random';

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => {
  const mockPrisma: any = {
    userSlotMachineTokens: {
      upsert: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    liveItem: { upsert: jest.fn() },
    userLiveItem: { upsert: jest.fn() },
  };
  mockPrisma.$transaction = jest.fn((callback: any) => callback(mockPrisma));
  return { __esModule: true, default: mockPrisma };
});

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), debug: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

const play = (gameType = 'roulette') =>
  POST(
    new NextRequest('http://localhost/api/minigames/play', {
      method: 'POST',
      body: JSON.stringify({ gameType }),
    })
  );

describe('POST /api/minigames/play', () => {
  let prisma: any;
  let randomSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1', role: 'USER' } });
    prisma = (await import('@/lib/prisma')).default;
    prisma.userSlotMachineTokens.upsert.mockResolvedValue({
      userId: 'user-1',
      tokens: 50,
      lastResetDate: new Date(),
      totalSpins: 0,
      totalWins: 0,
    });
    prisma.userSlotMachineTokens.updateMany.mockResolvedValue({ count: 1 });
    prisma.userSlotMachineTokens.findUnique.mockResolvedValue({ tokens: 40 });
    prisma.liveItem.upsert.mockResolvedValue({ id: 'item-1' });
    randomSpy = jest.spyOn(random, 'secureRandom').mockReturnValue(0.99); // perdu
  });

  afterEach(() => randomSpy.mockRestore());

  it('débite atomiquement le coût, conditionné au solde', async () => {
    const response = await play();
    expect(response.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.userSlotMachineTokens.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', tokens: { gte: 10 } },
      data: {
        tokens: { decrement: 10 },
        totalSpins: { increment: 1 },
        totalWins: { increment: 0 },
      },
    });
    const body = await response.json();
    expect(body.data.newBalance).toBe(40);
  });

  it('renvoie 400 si le débit ne passe pas (solde dépensé entre-temps)', async () => {
    prisma.userSlotMachineTokens.updateMany.mockResolvedValue({ count: 0 });
    const response = await play();
    expect(response.status).toBe(400);
    expect(prisma.userLiveItem.upsert).not.toHaveBeenCalled();
  });

  it('renvoie 400 sans écrire si le solde est insuffisant', async () => {
    prisma.userSlotMachineTokens.upsert.mockResolvedValue({
      userId: 'user-1',
      tokens: 5,
      lastResetDate: new Date(),
    });
    const response = await play();
    expect(response.status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('octroie le Queue Skip gagné dans la transaction', async () => {
    randomSpy.mockReturnValue(0.0005);
    const response = await play('scratch');
    expect(response.status).toBe(200);
    expect(prisma.userLiveItem.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.userLiveItem.upsert.mock.calls[0][0].create).toEqual(
      expect.objectContaining({ userId: 'user-1', quantity: 1 })
    );
  });

  it('octroie le Ticket Éternel gagné', async () => {
    randomSpy.mockReturnValue(0.005);
    await play('mystery');
    expect(prisma.userLiveItem.upsert).toHaveBeenCalledTimes(1);
  });

  it('crédite les jetons gagnés', async () => {
    randomSpy.mockReturnValue(0.03); // 50 jetons
    await play();
    expect(prisma.userSlotMachineTokens.update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { tokens: { increment: 50 } },
    });
    expect(prisma.userLiveItem.upsert).not.toHaveBeenCalled();
  });

  it('refuse un type de jeu invalide', async () => {
    const response = await play('poker');
    expect(response.status).toBe(400);
  });
});
