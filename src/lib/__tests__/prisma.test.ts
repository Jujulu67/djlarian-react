// Mock fs before importing prisma
const mockExistsSync = jest.fn(() => false);
const mockReadFileSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockUnlinkSync = jest.fn();

jest.mock('fs', () => ({
  existsSync: (...args: any[]) => mockExistsSync(...args),
  readFileSync: (...args: any[]) => mockReadFileSync(...args),
  writeFileSync: (...args: any[]) => mockWriteFileSync(...args),
  unlinkSync: (...args: any[]) => mockUnlinkSync(...args),
}));

// Mock path
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  resolve: jest.fn((...args) => args.join('/')),
  dirname: jest.fn((path) => path.split('/').slice(0, -1).join('/')),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock better-sqlite3
jest.mock('better-sqlite3', () => {
  return jest.fn().mockImplementation(() => ({
    prepare: jest.fn(),
    exec: jest.fn(),
    close: jest.fn(),
  }));
});

// Mock Prisma adapters
jest.mock('@prisma/adapter-better-sqlite3', () => ({
  PrismaBetterSqlite3: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('@prisma/adapter-neon', () => ({
  PrismaNeon: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));

// Mock PrismaClient
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  })),
}));

describe('prisma', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    mockExistsSync.mockReturnValue(false);
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  it('should export prisma client', async () => {
    const prisma = (await import('../prisma')).default;
    expect(prisma).toBeDefined();
  });

  it('should use DATABASE_URL from environment', async () => {
    process.env.DATABASE_URL = 'file:./test.db';
    jest.resetModules();
    const prisma = (await import('../prisma')).default;
    expect(prisma).toBeDefined();
  });

  it('should handle production environment', async () => {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgresql://test';
    jest.resetModules();
    const prisma = (await import('../prisma')).default;
    expect(prisma).toBeDefined();
  });

  it('should use SQLite adapter for file: URLs', async () => {
    process.env.DATABASE_URL = 'file:./test.db';
    jest.resetModules();
    const { PrismaBetterSqlite3 } = await import('@prisma/adapter-better-sqlite3');
    await import('../prisma');
    expect(PrismaBetterSqlite3).toHaveBeenCalled();
  });

  it('should use Neon adapter for Neon URLs', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@ep.neon.tech/db';
    jest.resetModules();
    const { PrismaNeon } = await import('@prisma/adapter-neon');
    await import('../prisma');
    expect(PrismaNeon).toHaveBeenCalled();
  });

  it('should use PostgreSQL adapter for postgresql:// URLs', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
    jest.resetModules();
    const { PrismaPg } = await import('@prisma/adapter-pg');
    await import('../prisma');
    expect(PrismaPg).toHaveBeenCalled();
  });

  it('should handle .db-switch.json configuration', async () => {
    process.env.DATABASE_URL = 'file:./dev.db';
    process.env.DATABASE_URL_PRODUCTION = 'postgresql://prod';
    mockExistsSync.mockImplementation((path: string) => {
      if (path.includes('.db-switch.json')) return true;
      if (path.includes('schema.prisma')) return true;
      return false;
    });
    mockReadFileSync.mockImplementation((path: string) => {
      if (path.includes('.db-switch.json')) {
        return JSON.stringify({ useProduction: true });
      }
      if (path.includes('schema.prisma')) {
        return 'provider = "sqlite"';
      }
      return '';
    });
    jest.resetModules();
    const prisma = (await import('../prisma')).default;
    expect(prisma).toBeDefined();
  });

  it('should handle schema synchronization', async () => {
    process.env.DATABASE_URL = 'file:./dev.db';
    mockExistsSync.mockImplementation((path: string) => {
      if (path.includes('schema.prisma')) return true;
      if (path.includes('.db-switch.json')) return true;
      return false;
    });
    mockReadFileSync.mockImplementation((path: string) => {
      if (path.includes('.db-switch.json')) {
        return JSON.stringify({ useProduction: false });
      }
      if (path.includes('schema.prisma')) {
        return 'provider = "postgresql"';
      }
      return '';
    });
    jest.resetModules();
    const prisma = (await import('../prisma')).default;
    expect(prisma).toBeDefined();
    // Should have attempted to write schema
    expect(mockWriteFileSync).toHaveBeenCalled();
  });

  it('should handle missing DATABASE_URL_PRODUCTION when switch is enabled', async () => {
    process.env.DATABASE_URL = 'file:./dev.db';
    delete process.env.DATABASE_URL_PRODUCTION;
    mockExistsSync.mockImplementation((path: string) => {
      if (path.includes('.db-switch.json')) return true;
      return false;
    });
    mockReadFileSync.mockImplementation((path: string) => {
      if (path.includes('.db-switch.json')) {
        return JSON.stringify({ useProduction: true });
      }
      return '';
    });
    jest.resetModules();
    const prisma = (await import('../prisma')).default;
    expect(prisma).toBeDefined();
  });

  it('should handle restart marker cleanup', async () => {
    process.env.DATABASE_URL = 'file:./dev.db';
    mockExistsSync.mockImplementation((path: string) => {
      if (path.includes('.db-restart-required.json')) return true;
      if (path.includes('.db-switch.json')) return true;
      if (path.includes('schema.prisma')) return true;
      return false;
    });
    mockReadFileSync.mockImplementation((path: string) => {
      if (path.includes('.db-switch.json')) {
        return JSON.stringify({ useProduction: false });
      }
      if (path.includes('schema.prisma')) {
        return 'provider = "sqlite"';
      }
      return '';
    });
    jest.resetModules();
    const prisma = (await import('../prisma')).default;
    expect(prisma).toBeDefined();
    // Should have attempted to unlink restart marker
    expect(mockUnlinkSync).toHaveBeenCalled();
  });
});
