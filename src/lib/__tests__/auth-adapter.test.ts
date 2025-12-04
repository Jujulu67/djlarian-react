import { CustomPrismaAdapter } from '../auth-adapter';
import { PrismaAdapter } from '@auth/prisma-adapter';
import prisma from '../prisma';

// Mock PrismaAdapter
jest.mock('@auth/prisma-adapter', () => ({
  PrismaAdapter: jest.fn(),
}));

// Mock prisma
jest.mock('../prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
    account: {
      findUnique: jest.fn(),
    },
  },
}));

describe('auth-adapter', () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;
  let mockBaseAdapter: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock base adapter
    mockBaseAdapter = {
      getUserByEmail: jest.fn(),
      createUser: jest.fn(),
      linkAccount: jest.fn(),
    };

    (PrismaAdapter as jest.Mock).mockReturnValue(mockBaseAdapter);
  });

  describe('CustomPrismaAdapter', () => {
    it('should create adapter with base adapter', () => {
      const adapter = CustomPrismaAdapter(mockPrisma as any);
      expect(adapter).toBeDefined();
      expect(PrismaAdapter).toHaveBeenCalledWith(mockPrisma);
    });

    describe('getUserByEmail', () => {
      it('should call base adapter getUserByEmail', async () => {
        const adapter = CustomPrismaAdapter(mockPrisma as any);
        const mockUser = { id: 'user-1', email: 'test@example.com' };
        mockBaseAdapter.getUserByEmail.mockResolvedValue(mockUser);

        const result = await adapter.getUserByEmail?.('test@example.com');

        expect(mockBaseAdapter.getUserByEmail).toHaveBeenCalledWith('test@example.com');
        expect(result).toEqual(mockUser);
      });

      it('should return null if base adapter does not have getUserByEmail', async () => {
        mockBaseAdapter.getUserByEmail = undefined;
        const adapter = CustomPrismaAdapter(mockPrisma as any);

        const result = await adapter.getUserByEmail?.('test@example.com');

        expect(result).toBeNull();
      });
    });

    describe('createUser', () => {
      it('should return existing user if email exists', async () => {
        const adapter = CustomPrismaAdapter(mockPrisma as any);
        const existingUser = {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          Account: [],
        };
        mockPrisma.user.findUnique.mockResolvedValue(existingUser as any);

        const result = await adapter.createUser?.({
          email: 'test@example.com',
          name: 'Test User',
        });

        expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
          where: { email: 'test@example.com' },
        });
        expect(result).toEqual({
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
        });
        expect(mockBaseAdapter.createUser).not.toHaveBeenCalled();
      });

      it('should create new user if email does not exist', async () => {
        const adapter = CustomPrismaAdapter(mockPrisma as any);
        const newUser = {
          id: 'user-2',
          email: 'new@example.com',
          name: 'New User',
        };
        mockPrisma.user.findUnique.mockResolvedValue(null);
        mockBaseAdapter.createUser.mockResolvedValue(newUser);

        const result = await adapter.createUser?.({
          email: 'new@example.com',
          name: 'New User',
        });

        expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
          where: { email: 'new@example.com' },
        });
        expect(mockBaseAdapter.createUser).toHaveBeenCalledWith({
          email: 'new@example.com',
          name: 'New User',
        });
        expect(result).toEqual(newUser);
      });

      it('should create new user if no email provided', async () => {
        const adapter = CustomPrismaAdapter(mockPrisma as any);
        const newUser = {
          id: 'user-3',
          name: 'No Email User',
        };
        mockBaseAdapter.createUser.mockResolvedValue(newUser);

        const result = await adapter.createUser?.({
          name: 'No Email User',
        });

        expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
        expect(mockBaseAdapter.createUser).toHaveBeenCalledWith({
          name: 'No Email User',
        });
        expect(result).toEqual(newUser);
      });

      it('should throw error if base adapter createUser is not available', async () => {
        mockBaseAdapter.createUser = undefined;
        const adapter = CustomPrismaAdapter(mockPrisma as any);
        mockPrisma.user.findUnique.mockResolvedValue(null);

        await expect(adapter.createUser?.({ email: 'test@example.com' })).rejects.toThrow(
          'createUser is not available in baseAdapter'
        );
      });
    });

    describe('linkAccount', () => {
      it('should return existing account if it exists', async () => {
        const adapter = CustomPrismaAdapter(mockPrisma as any);
        const existingAccount = {
          id: 'account-1',
          provider: 'google',
          providerAccountId: 'google-123',
          userId: 'user-1',
        };
        mockPrisma.account.findUnique.mockResolvedValue(existingAccount as any);

        const result = await adapter.linkAccount?.({
          provider: 'google',
          providerAccountId: 'google-123',
          type: 'oauth',
          userId: 'user-1',
        } as any);

        expect(mockPrisma.account.findUnique).toHaveBeenCalledWith({
          where: {
            provider_providerAccountId: {
              provider: 'google',
              providerAccountId: 'google-123',
            },
          },
        });
        expect(result).toEqual(existingAccount);
        expect(mockBaseAdapter.linkAccount).not.toHaveBeenCalled();
      });

      it('should create new account if it does not exist', async () => {
        const adapter = CustomPrismaAdapter(mockPrisma as any);
        const newAccount = {
          id: 'account-2',
          provider: 'google',
          providerAccountId: 'google-456',
          userId: 'user-2',
        };
        mockPrisma.account.findUnique.mockResolvedValue(null);
        mockBaseAdapter.linkAccount.mockResolvedValue(newAccount);

        const result = await adapter.linkAccount?.({
          provider: 'google',
          providerAccountId: 'google-456',
          type: 'oauth',
          userId: 'user-2',
        } as any);

        expect(mockPrisma.account.findUnique).toHaveBeenCalled();
        expect(mockBaseAdapter.linkAccount).toHaveBeenCalledWith({
          provider: 'google',
          providerAccountId: 'google-456',
          type: 'oauth',
          userId: 'user-2',
        });
        expect(result).toEqual(newAccount);
      });

      it('should return null if base adapter returns null', async () => {
        const adapter = CustomPrismaAdapter(mockPrisma as any);
        mockPrisma.account.findUnique.mockResolvedValue(null);
        mockBaseAdapter.linkAccount.mockResolvedValue(null);

        const result = await adapter.linkAccount?.({
          provider: 'google',
          providerAccountId: 'google-789',
          type: 'oauth',
          userId: 'user-3',
        } as any);

        expect(result).toBeNull();
      });

      it('should return null if base adapter returns undefined', async () => {
        const adapter = CustomPrismaAdapter(mockPrisma as any);
        mockPrisma.account.findUnique.mockResolvedValue(null);
        mockBaseAdapter.linkAccount.mockResolvedValue(undefined);

        const result = await adapter.linkAccount?.({
          provider: 'google',
          providerAccountId: 'google-789',
          type: 'oauth',
          userId: 'user-3',
        } as any);

        expect(result).toBeNull();
      });

      it('should throw error if base adapter linkAccount is not available', async () => {
        mockBaseAdapter.linkAccount = undefined;
        const adapter = CustomPrismaAdapter(mockPrisma as any);
        mockPrisma.account.findUnique.mockResolvedValue(null);

        await expect(
          adapter.linkAccount?.({
            provider: 'google',
            providerAccountId: 'google-999',
            type: 'oauth',
            userId: 'user-4',
          } as any)
        ).rejects.toThrow('linkAccount is not available in baseAdapter');
      });
    });

    describe('edge cases', () => {
      it('should handle getUserByEmail returning null', async () => {
        const adapter = CustomPrismaAdapter(mockPrisma as any);
        mockBaseAdapter.getUserByEmail.mockResolvedValue(null);

        const result = await adapter.getUserByEmail?.('test@example.com');

        expect(result).toBeNull();
      });

      it('should handle createUser with email that exists but has different case', async () => {
        const adapter = CustomPrismaAdapter(mockPrisma as any);
        const existingUser = {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          Account: [],
        };
        mockPrisma.user.findUnique.mockResolvedValue(existingUser as any);

        const result = await adapter.createUser?.({
          email: 'TEST@EXAMPLE.COM',
          name: 'Test User',
        });

        expect(result).toEqual({
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
        });
      });

      it('should handle linkAccount with existing account having different userId', async () => {
        const adapter = CustomPrismaAdapter(mockPrisma as any);
        const existingAccount = {
          id: 'account-1',
          provider: 'google',
          providerAccountId: 'google-123',
          userId: 'user-2', // Different user
        };
        mockPrisma.account.findUnique.mockResolvedValue(existingAccount as any);

        const result = await adapter.linkAccount?.({
          provider: 'google',
          providerAccountId: 'google-123',
          type: 'oauth',
          userId: 'user-1',
        } as any);

        // Should return existing account even if userId differs
        expect(result).toEqual(existingAccount);
      });
    });
  });
});
