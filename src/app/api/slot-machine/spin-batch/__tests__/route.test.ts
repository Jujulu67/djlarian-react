/**
 * Tests for /api/slot-machine/spin-batch route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { determineReward } from '@/lib/slot-machine-logic';
import { RewardType } from '@/types/slot-machine';

import { POST } from '../route';

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => {
  const mockPrisma: any = {
    userSlotMachineTokens: {
      upsert: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    liveItem: { upsert: jest.fn() },
    userLiveItem: { upsert: jest.fn() },
  };
  mockPrisma.$transaction = jest.fn((callback: any) => callback(mockPrisma));
  return { __esModule: true, default: mockPrisma };
});

jest.mock('@/lib/slot-machine-logic', () => ({
  ...jest.requireActual('@/lib/slot-machine-logic'),
  determineReward: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), debug: jest.fn(), warn: jest.fn() },
}));

const mockDetermineReward = determineReward as jest.MockedFunction<typeof determineReward>;

const request = (body: unknown) =>
  new NextRequest('http://localhost/api/slot-machine/spin-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('/api/slot-machine/spin-batch', () => {
  let prisma: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1', role: 'USER' } });
    prisma = (await import('@/lib/prisma')).default;
    prisma.userSlotMachineTokens.upsert.mockResolvedValue({
      userId: 'user-1',
      tokens: 300,
      lastResetDate: new Date(),
      totalSpins: 0,
      totalWins: 0,
    });
    prisma.userSlotMachineTokens.updateMany.mockResolvedValue({ count: 1 });
    prisma.liveItem.upsert.mockImplementation(({ where }: any) =>
      Promise.resolve({ id: `item-${where.type}` })
    );
  });

  it.each([0, -1, 2.5, 101, 1000, '5', null])('rejects count=%p with 400', async (count) => {
    const response = await POST(request({ count }));

    expect(response.status).toBe(400);
    expect(prisma.userSlotMachineTokens.updateMany).not.toHaveBeenCalled();
  });

  it('accepts the largest batch offered by the UI (100)', async () => {
    mockDetermineReward.mockReturnValue({
      rewardType: null,
      rewardAmount: 0,
      isWin: false,
      message: 'perdu',
    });

    const response = await POST(request({ count: 100 }));

    expect(response.status).toBe(200);
    expect(prisma.userSlotMachineTokens.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', tokens: { gte: 300 } },
      data: {
        tokens: { decrement: 300 },
        totalSpins: { increment: 100 },
        totalWins: { increment: 0 },
      },
    });
  });

  it('grants every item won in the batch server-side', async () => {
    mockDetermineReward
      .mockReturnValueOnce({
        rewardType: RewardType.QUEUE_SKIP,
        rewardAmount: 1,
        isWin: true,
        message: 'QS',
      })
      .mockReturnValueOnce({
        rewardType: RewardType.ETERNAL_TICKET,
        rewardAmount: 1,
        isWin: true,
        message: 'ET',
      })
      .mockReturnValueOnce({
        rewardType: RewardType.ETERNAL_TICKET,
        rewardAmount: 1,
        isWin: true,
        message: 'ET',
      })
      .mockReturnValue({
        rewardType: RewardType.TOKENS,
        rewardAmount: 2,
        isWin: true,
        message: '',
      });

    const response = await POST(request({ count: 5 }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.summary).toMatchObject({ queueSkips: 1, eternalTickets: 2 });
    expect(prisma.userLiveItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_itemId: { userId: 'user-1', itemId: 'item-QUEUE_SKIP' } },
        update: { quantity: { increment: 1 } },
      })
    );
    expect(prisma.userLiveItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_itemId: { userId: 'user-1', itemId: 'item-ETERNAL_TICKET' } },
        update: { quantity: { increment: 2 } },
      })
    );
    // 100 (QS) + 2 × 50 (ET) + 2 × 2 jetons
    expect(prisma.userSlotMachineTokens.update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { tokens: { increment: 204 } },
    });
  });

  it('refuses when the balance does not cover the batch', async () => {
    prisma.userSlotMachineTokens.upsert.mockResolvedValue({
      userId: 'user-1',
      tokens: 10,
      lastResetDate: new Date(),
      totalSpins: 0,
      totalWins: 0,
    });

    const response = await POST(request({ count: 5 }));

    expect(response.status).toBe(400);
    expect(prisma.userSlotMachineTokens.updateMany).not.toHaveBeenCalled();
  });

  it('refuses and grants nothing when the atomic debit matches no row', async () => {
    mockDetermineReward.mockReturnValue({
      rewardType: RewardType.QUEUE_SKIP,
      rewardAmount: 1,
      isWin: true,
      message: 'QS',
    });
    prisma.userSlotMachineTokens.updateMany.mockResolvedValue({ count: 0 });

    const response = await POST(request({ count: 10 }));

    expect(response.status).toBe(400);
    expect(prisma.userSlotMachineTokens.update).not.toHaveBeenCalled();
    expect(prisma.userLiveItem.upsert).not.toHaveBeenCalled();
  });
});
