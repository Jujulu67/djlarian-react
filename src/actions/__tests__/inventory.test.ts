import {
  getInventory,
  getAllItems,
  addItemToUser,
  removeItemFromUser,
  activateItem,
  deactivateItem,
  toggleItemActivation,
  searchUsers,
} from '../inventory';

// Mock auth
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

// Mock prisma
jest.mock('@/lib/prisma', () => {
  const mockPrisma = {
    userLiveItem: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    liveItem: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  return {
    __esModule: true,
    default: mockPrisma,
  };
});

// Mock db-performance
jest.mock('@/lib/db-performance', () => ({
  createDbPerformanceLogger: jest.fn(() => ({
    start: jest.fn(() => Date.now()),
    logQuery: jest.fn(),
    end: jest.fn(),
  })),
}));

// Mock next/cache
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('inventory actions', () => {
  const mockSession = {
    user: {
      id: 'user-1',
      role: 'ADMIN',
    },
  };

  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    const { auth } = require('@/auth');
    auth.mockResolvedValue(mockSession);

    // Get the mocked prisma instance
    const prismaModule = require('@/lib/prisma');
    mockPrisma = prismaModule.default;
  });

  describe('getInventory', () => {
    it('should return inventory for user', async () => {
      mockPrisma.userLiveItem.findMany.mockResolvedValue([
        {
          id: '1',
          userId: 'user-1',
          itemId: 'item-1',
          quantity: 5,
          LiveItem: { id: 'item-1', name: 'Test Item' },
        },
      ]);

      const result = await getInventory('user-1');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockPrisma.userLiveItem.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { LiveItem: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return error if unauthorized', async () => {
      const { auth } = require('@/auth');
      auth.mockResolvedValue({ user: { role: 'USER' } });

      const result = await getInventory('user-1');

      expect(result.success).toBe(false);
    });

    it('should handle errors', async () => {
      mockPrisma.userLiveItem.findMany.mockRejectedValue(new Error('DB error'));

      const result = await getInventory('user-1');

      expect(result.success).toBe(false);
    });
  });

  describe('getAllItems', () => {
    it('should return all active items', async () => {
      mockPrisma.liveItem.findMany.mockResolvedValue([
        { id: 'item-1', name: 'Item 1', isActive: true },
      ]);

      const result = await getAllItems();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockPrisma.liveItem.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
    });

    it('should return error if unauthorized', async () => {
      const { auth } = require('@/auth');
      auth.mockResolvedValue(null);

      const result = await getAllItems();

      expect(result.success).toBe(false);
    });
  });

  describe('addItemToUser', () => {
    it('should create new item if not exists', async () => {
      mockPrisma.userLiveItem.findUnique.mockResolvedValue(null);
      mockPrisma.userLiveItem.create.mockResolvedValue({
        id: '1',
        userId: 'user-1',
        itemId: 'item-1',
        quantity: 1,
      });

      const result = await addItemToUser('user-1', 'item-1', 1);

      expect(result.success).toBe(true);
      expect(mockPrisma.userLiveItem.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          itemId: 'item-1',
          quantity: 1,
        },
      });
    });

    it('should update quantity if item exists', async () => {
      mockPrisma.userLiveItem.findUnique.mockResolvedValue({
        id: '1',
        userId: 'user-1',
        itemId: 'item-1',
        quantity: 5,
      });
      mockPrisma.userLiveItem.update.mockResolvedValue({ id: '1', quantity: 7 });

      const result = await addItemToUser('user-1', 'item-1', 2);

      expect(result.success).toBe(true);
      expect(mockPrisma.userLiveItem.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { quantity: { increment: 2 } },
      });
    });
  });

  describe('removeItemFromUser', () => {
    it('should delete item if quantity is 0', async () => {
      mockPrisma.userLiveItem.findUnique.mockResolvedValue({
        id: '1',
        quantity: 1,
      });
      mockPrisma.userLiveItem.delete.mockResolvedValue({ id: '1' });

      const result = await removeItemFromUser('user-1', 'item-1', 1);

      expect(result.success).toBe(true);
      expect(mockPrisma.userLiveItem.delete).toHaveBeenCalled();
    });

    it('should decrement quantity if quantity > 0', async () => {
      mockPrisma.userLiveItem.findUnique.mockResolvedValue({
        id: '1',
        quantity: 5,
      });
      mockPrisma.userLiveItem.update.mockResolvedValue({ id: '1' });

      const result = await removeItemFromUser('user-1', 'item-1', 2);

      expect(result.success).toBe(true);
      expect(mockPrisma.userLiveItem.update).toHaveBeenCalled();
    });

    it('should return error if item not found', async () => {
      mockPrisma.userLiveItem.findUnique.mockResolvedValue(null);

      const result = await removeItemFromUser('user-1', 'item-1', 1);

      expect(result.success).toBe(false);
    });
  });

  describe('activateItem', () => {
    it('should activate item', async () => {
      mockPrisma.userLiveItem.findUnique.mockResolvedValue({
        id: '1',
        userId: 'user-1',
        quantity: 5,
        activatedQuantity: 0,
        LiveItem: { type: 'NORMAL', name: 'Item' },
      });
      mockPrisma.userLiveItem.update.mockResolvedValue({ id: '1' });

      const result = await activateItem('item-1');

      expect(result.success).toBe(true);
      expect(mockPrisma.userLiveItem.update).toHaveBeenCalled();
    });

    it('should return error if all items already activated', async () => {
      mockPrisma.userLiveItem.findUnique.mockResolvedValue({
        id: '1',
        quantity: 5,
        activatedQuantity: 5,
        LiveItem: { type: 'NORMAL' },
      });

      const result = await activateItem('item-1');

      expect(result.success).toBe(false);
    });
  });

  describe('deactivateItem', () => {
    it('should deactivate item', async () => {
      mockPrisma.userLiveItem.findUnique.mockResolvedValue({
        id: '1',
        activatedQuantity: 1,
        LiveItem: { type: 'NORMAL' },
      });
      mockPrisma.userLiveItem.update.mockResolvedValue({ id: '1' });

      const result = await deactivateItem('item-1');

      expect(result.success).toBe(true);
    });

    it('should return error if no items activated', async () => {
      mockPrisma.userLiveItem.findUnique.mockResolvedValue({
        id: '1',
        activatedQuantity: 0,
        LiveItem: { type: 'NORMAL' },
      });

      const result = await deactivateItem('item-1');

      expect(result.success).toBe(false);
    });
  });

  describe('toggleItemActivation', () => {
    it('should activate if currently inactive', async () => {
      mockPrisma.userLiveItem.findUnique.mockResolvedValue({
        id: '1',
        activatedQuantity: 0,
        LiveItem: { type: 'NORMAL' },
      });
      mockPrisma.userLiveItem.update.mockResolvedValue({ id: '1' });

      const result = await toggleItemActivation('item-1');

      expect(result.success).toBe(true);
    });

    it('should deactivate if currently active', async () => {
      mockPrisma.userLiveItem.findUnique.mockResolvedValue({
        id: '1',
        activatedQuantity: 1,
        LiveItem: { type: 'NORMAL' },
      });
      mockPrisma.userLiveItem.update.mockResolvedValue({ id: '1' });

      const result = await toggleItemActivation('item-1');

      expect(result.success).toBe(true);
    });
  });

  describe('searchUsers', () => {
    it('should search users by name or email', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', name: 'Test User', email: 'test@example.com' },
      ]);

      const result = await searchUsers('test');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should return empty if query too short', async () => {
      const result = await searchUsers('t');

      expect(result.success).toBe(true);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        })
      );
    });
  });
});
