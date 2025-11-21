// Mock pour @prisma/client dans les tests Jest
// Prisma 7 utilise des modules ESM, donc on doit créer un mock compatible avec Jest

export const PrismaClient = jest.fn().mockImplementation(() => ({
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $transaction: jest.fn(),
  $extends: jest.fn(),
  account: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  event: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  genre: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  track: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  session: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  siteConfig: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  configHistory: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  configSnapshot: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  musicCollection: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  trackPlatform: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  genresOnTracks: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  recurrenceConfig: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  ticketInfo: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  verificationToken: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock du namespace Prisma
export const Prisma = {
  PrismaClientKnownRequestError: class extends Error {
    code: string;
    meta?: unknown;
    constructor(message: string, code: string, meta?: unknown) {
      super(message);
      this.code = code;
      this.meta = meta;
      this.name = 'PrismaClientKnownRequestError';
    }
  },
  PrismaClientUnknownRequestError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'PrismaClientUnknownRequestError';
    }
  },
  PrismaClientRustPanicError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'PrismaClientRustPanicError';
    }
  },
  PrismaClientInitializationError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'PrismaClientInitializationError';
    }
  },
  PrismaClientValidationError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'PrismaClientValidationError';
    }
  },
  // Types de base pour les tests
  Decimal: class Decimal {
    constructor(public value: string | number) {}
    toString(): string {
      return String(this.value);
    }
    toNumber(): number {
      return Number(this.value);
    }
  },
  JsonNull: null,
  DbNull: null,
  // Helpers pour les types
  AtLeast: <T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
    const result = {} as Pick<T, K>;
    keys.forEach((key) => {
      if (key in obj) {
        result[key] = obj[key];
      }
    });
    return result;
  },
};

// Export des types (mocks vides pour les tests)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Account = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Event = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Genre = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GenresOnTracks = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MusicCollection = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RecurrenceConfig = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Session = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TicketInfo = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Track = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TrackPlatform = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type User = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type VerificationToken = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SiteConfig = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ConfigHistory = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ConfigSnapshot = any;
