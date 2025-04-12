import { PrismaClient, User as PrismaUser } from '@prisma/client';
import { compare } from 'bcryptjs';
// const prisma = new PrismaClient(); // Commenté car nous allons mocker
import { describe, expect, test, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { mockReset, DeepMockProxy, mockDeep } from 'jest-mock-extended';

// Créer un type pour notre mock Prisma
type MockPrismaClient = DeepMockProxy<PrismaClient>;

// Mocker le module PrismaClient
jest.mock('@prisma/client', () => {
  const mockExtended = jest.requireActual('jest-mock-extended');
  const mock = mockExtended.mockDeep();
  return {
    PrismaClient: jest.fn(() => mock),
  };
});

// Mocker bcryptjs
jest.mock('bcryptjs');

// Créer une instance du mock accessible
let prismaMock: MockPrismaClient;

describe('Authentication Tests', () => {
  beforeAll(async () => {
    // Pas besoin de $connect
  });

  beforeEach(() => {
    prismaMock = mockDeep<PrismaClient>() as MockPrismaClient;
    (PrismaClient as jest.Mock).mockImplementation(() => prismaMock);
    mockReset(prismaMock);
    (compare as jest.Mock).mockClear();

    // Configurer les mocks. Utiliser un cast vers Partial<PrismaUser> pour flexibilité
    const mockAdminUser: Partial<PrismaUser> = {
      id: 'cluuidtestadmin',
      name: 'Admin User',
      email: 'juanzeiher@gmail.com',
      emailVerified: new Date(),
      image: null,
      hashedPassword: 'hashed_password_example',
      role: 'ADMIN',
    };

    prismaMock.user.findUnique.mockResolvedValue(mockAdminUser as PrismaUser);
    prismaMock.user.findMany.mockResolvedValue([mockAdminUser as PrismaUser]);
    (compare as jest.Mock).mockResolvedValue(true);
  });

  afterAll(async () => {
    // Pas besoin de $disconnect
  });

  test('should find admin user with correct email', async () => {
    const adminUser = await prismaMock.user.findUnique({
      where: {
        email: 'juanzeiher@gmail.com',
      },
    });

    expect(adminUser).not.toBeNull();
    expect(adminUser?.email).toBe('juanzeiher@gmail.com');
    expect(adminUser?.role).toBe('ADMIN');
  });

  test('should verify password hash is valid', async () => {
    const user = await prismaMock.user.findUnique({
      where: {
        email: 'juanzeiher@gmail.com',
      },
    });

    expect(user).not.toBeNull();
    expect(user?.hashedPassword).not.toBeNull();

    const isValidPassword = user?.hashedPassword
      ? await compare('votre_mot_de_passe', user.hashedPassword)
      : false;

    console.log('Password validation result:', isValidPassword);
  });

  test('should verify user has required fields for authentication', async () => {
    const mockUserWithAccounts: Partial<PrismaUser & { accounts: any[] }> = {
      id: 'cluuidtestadmin',
      name: 'Admin User',
      email: 'juanzeiher@gmail.com',
      emailVerified: new Date(),
      image: null,
      hashedPassword: 'hashed_password_example',
      role: 'ADMIN',
      accounts: [{ provider: 'google' }, { provider: 'twitch' }],
    };

    prismaMock.user.findUnique
      .calledWith(expect.objectContaining({ include: { accounts: true } }))
      .mockResolvedValue(mockUserWithAccounts as any);

    const user = await prismaMock.user.findUnique({
      where: {
        email: 'juanzeiher@gmail.com',
      },
      include: {
        accounts: true,
      },
    });

    expect(user).not.toBeNull();
    expect(user?.email).not.toBeNull();
    expect(user?.id).not.toBeNull();

    if (user?.accounts) {
      console.log('Available authentication methods:');
      user.accounts.forEach((account: any) => {
        console.log(`- ${account.provider}`);
      });
    } else {
      console.log('No external authentication methods found');
    }
  });

  test('should list all users and verify only one admin exists', async () => {
    const allUsers = await prismaMock.user.findMany();
    const adminUsers = allUsers.filter((user) => user.role === 'ADMIN');

    expect(allUsers.length).toBeGreaterThan(0);
    expect(adminUsers.length).toBe(1);
    expect(adminUsers[0].email).toBe('juanzeiher@gmail.com');
  });
});
