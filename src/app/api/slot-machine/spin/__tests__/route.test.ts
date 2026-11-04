/**
 * Tests for /api/slot-machine/spin route
 * @jest-environment node
 */
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

const tokensRow = (overrides: Record<string, unknown> = {}) => ({
  userId: 'user-1',
  tokens: 50,
  lastResetDate: new Date(),
  totalSpins: 0,
  totalWins: 0,
  ...overrides,
});

describe('/api/slot-machine/spin', () => {
  let prisma: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1', role: 'USER' } });
    prisma = (await import('@/lib/prisma')).default;
    prisma.userSlotMachineTokens.upsert.mockResolvedValue(tokensRow());
    prisma.userSlotMachineTokens.updateMany.mockResolvedValue({ count: 1 });
    prisma.liveItem.upsert.mockResolvedValue({ id: 'item-qs' });
  });

  it('returns 401 for a visitor', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await POST();

    expect(response.status).toBe(401);
    expect(prisma.userSlotMachineTokens.updateMany).not.toHaveBeenCalled();
  });

  it('debits tokens atomically and credits token winnings', async () => {
    mockDetermineReward.mockReturnValue({
      rewardType: RewardType.TOKENS,
      rewardAmount: 25,
      isWin: true,
      message: '+25',
    });

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.rewardType).toBe(RewardType.TOKENS);
    expect(prisma.userSlotMachineTokens.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', tokens: { gte: 3 } },
      data: {
        tokens: { decrement: 3 },
        totalSpins: { increment: 1 },
        totalWins: { increment: 1 },
      },
    });
    expect(prisma.userSlotMachineTokens.update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { tokens: { increment: 25 } },
    });
    expect(prisma.userLiveItem.upsert).not.toHaveBeenCalled();
  });

  it('grants a won Queue Skip server-side in the same transaction', async () => {
    mockDetermineReward.mockReturnValue({
      rewardType: RewardType.QUEUE_SKIP,
      rewardAmount: 1,
      isWin: true,
      message: 'JACKPOT',
    });

    const response = await POST();

    expect(response.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.liveItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { type: 'QUEUE_SKIP' } })
    );
    expect(prisma.userLiveItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_itemId: { userId: 'user-1', itemId: 'item-qs' } },
        update: { quantity: { increment: 1 } },
        create: expect.objectContaining({ userId: 'user-1', itemId: 'item-qs', quantity: 1 }),
      })
    );
    // Bonus de 100 jetons pour un Queue Skip
    expect(prisma.userSlotMachineTokens.update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { tokens: { increment: 100 } },
    });
  });

  it('refuses when the balance is below the spin cost', async () => {
    prisma.userSlotMachineTokens.upsert.mockResolvedValue(tokensRow({ tokens: 2 }));

    const response = await POST();

    expect(response.status).toBe(400);
    expect(prisma.userSlotMachineTokens.updateMany).not.toHaveBeenCalled();
  });

  it('refuses and grants nothing when the atomic debit matches no row (concurrent spin)', async () => {
    mockDetermineReward.mockReturnValue({
      rewardType: RewardType.ETERNAL_TICKET,
      rewardAmount: 1,
      isWin: true,
      message: 'JACKPOT',
    });
    prisma.userSlotMachineTokens.updateMany.mockResolvedValue({ count: 0 });

    const response = await POST();

    expect(response.status).toBe(400);
    expect(prisma.userSlotMachineTokens.update).not.toHaveBeenCalled();
    expect(prisma.userLiveItem.upsert).not.toHaveBeenCalled();
  });

  it('applies the daily reset only once, conditioned on the previous reset date', async () => {
    const yesterday = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    prisma.userSlotMachineTokens.upsert.mockResolvedValue(
      tokensRow({ tokens: 0, lastResetDate: yesterday })
    );
    prisma.userSlotMachineTokens.updateMany
      .mockResolvedValueOnce({ count: 1 }) // reset
      .mockResolvedValueOnce({ count: 1 }); // debit
    prisma.userSlotMachineTokens.findUniqueOrThrow.mockResolvedValue(tokensRow({ tokens: 100 }));
    mockDetermineReward.mockReturnValue({
      rewardType: null,
      rewardAmount: 0,
      isWin: false,
      message: 'perdu',
    });

    const response = await POST();

    expect(response.status).toBe(200);
    expect(prisma.userSlotMachineTokens.updateMany).toHaveBeenNthCalledWith(1, {
      where: { userId: 'user-1', lastResetDate: yesterday },
      data: { tokens: 100, lastResetDate: expect.any(Date) },
    });
  });
});
