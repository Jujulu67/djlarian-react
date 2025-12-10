/**
 * Tests for errorHandler
 * @jest-environment node
 */
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

import { handleApiError } from '../errorHandler';

// Mock dependencies
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}));

describe('handleApiError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
  });

  it('should handle Zod validation errors', () => {
    const zodError = new ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'number',
        path: ['email'],
        message: 'Expected string, received number',
      },
    ]);

    const response = handleApiError(zodError, 'POST /api/test');

    expect(response.status).toBe(400);
    const data = response.json() as Promise<{ error: string; details?: unknown }>;
    return data.then((result) => {
      expect(result.error).toBe('Validation failed');
      expect(result.details).toBeDefined();
    });
  });

  it('should handle standard Error objects', () => {
    const error = new Error('Test error');

    const response = handleApiError(error, 'GET /api/test');

    expect(response.status).toBe(500);
    const data = response.json() as Promise<{ error: string }>;
    return data.then((result) => {
      expect(result.error).toBe('Test error');
    });
  });

  it('should handle Prisma errors with code', () => {
    const prismaError = {
      code: 'P2002',
      meta: { target: ['email'] },
      message: 'Unique constraint failed',
    } as Prisma.PrismaClientKnownRequestError;

    const response = handleApiError(prismaError, 'POST /api/test');

    expect(response.status).toBe(409);
  });

  it('should handle unknown error types', () => {
    const unknownError = { someProperty: 'value' };

    const response = handleApiError(unknownError, 'GET /api/test');

    expect(response.status).toBe(500);
    const data = response.json() as Promise<{ error: string }>;
    return data.then((result) => {
      expect(result.error).toBe('An unexpected error occurred');
    });
  });

  it('should include context in error handling', () => {
    const error = new Error('Test error');
    const { logger } = require('@/lib/logger');

    handleApiError(error, 'POST /api/test');

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('[POST /api/test]'), error);
  });

  it('should handle Prisma P2003 error with collectionId', () => {
    const prismaError = {
      code: 'P2003',
      meta: { field_name: 'collectionId' },
      message: 'Foreign key constraint failed',
    } as Prisma.PrismaClientKnownRequestError;

    const response = handleApiError(prismaError, 'POST /api/test');

    expect(response.status).toBe(400);
    const data = response.json() as Promise<{ error: string }>;
    return data.then((result) => {
      expect(result.error).toContain('music collection');
    });
  });

  it('should handle Prisma P2003 error with imageId', () => {
    const prismaError = {
      code: 'P2003',
      meta: { field_name: 'imageId' },
      message: 'Foreign key constraint failed',
    } as Prisma.PrismaClientKnownRequestError;

    const response = handleApiError(prismaError, 'POST /api/test');

    expect(response.status).toBe(400);
    const data = response.json() as Promise<{ error: string }>;
    return data.then((result) => {
      expect(result.error).toContain('image');
    });
  });

  it('should handle Prisma P2003 error with userId', () => {
    const prismaError = {
      code: 'P2003',
      meta: { field_name: 'userId' },
      message: 'Foreign key constraint failed',
    } as Prisma.PrismaClientKnownRequestError;

    const response = handleApiError(prismaError, 'POST /api/test');

    expect(response.status).toBe(400);
    const data = response.json() as Promise<{ error: string }>;
    return data.then((result) => {
      expect(result.error).toContain('user');
    });
  });

  it('should handle Prisma P2003 error with unknown field', () => {
    const prismaError = {
      code: 'P2003',
      meta: { field_name: 'unknownField' },
      message: 'Foreign key constraint failed',
    } as Prisma.PrismaClientKnownRequestError;

    const response = handleApiError(prismaError, 'POST /api/test');

    expect(response.status).toBe(400);
    const data = response.json() as Promise<{ error: string }>;
    return data.then((result) => {
      expect(result.error).toContain('Invalid reference');
    });
  });

  it('should handle Prisma P2025 error (record not found)', () => {
    const prismaError = {
      code: 'P2025',
      meta: {},
      message: 'Record not found',
    } as Prisma.PrismaClientKnownRequestError;

    const response = handleApiError(prismaError, 'GET /api/test');

    expect(response.status).toBe(404);
  });

  it('should handle Prisma P2014 error (required relation)', () => {
    const prismaError = {
      code: 'P2014',
      meta: { field_name: 'userId' },
      message: 'Required relation violation',
    } as Prisma.PrismaClientKnownRequestError;

    const response = handleApiError(prismaError, 'POST /api/test');

    expect(response.status).toBe(400);
    const data = response.json() as Promise<{ error: string }>;
    return data.then((result) => {
      expect(result.error).toContain('Required relation');
    });
  });

  it('should handle unknown Prisma error code', () => {
    const prismaError = {
      code: 'P9999',
      meta: { some: 'data' },
      message: 'Unknown Prisma error',
    } as Prisma.PrismaClientKnownRequestError;

    const response = handleApiError(prismaError, 'POST /api/test');

    expect(response.status).toBe(500);
  });

  it('should handle Prisma error detected by code property', () => {
    const prismaError = {
      code: 'P2002',
      meta: { target: ['email'] },
      message: 'Unique constraint failed',
    } as unknown as Prisma.PrismaClientKnownRequestError;

    const response = handleApiError(prismaError, 'POST /api/test');

    expect(response.status).toBe(409);
  });

  it('should handle PrismaClientUnknownRequestError', () => {
    const error = {
      constructor: { name: 'PrismaClientUnknownRequestError' },
      message: 'Unknown Prisma error',
    } as unknown as Error;

    const response = handleApiError(error, 'GET /api/test');

    expect(response.status).toBe(500);
  });

  it('should handle PrismaClientValidationError', () => {
    const error = {
      constructor: { name: 'PrismaClientValidationError' },
      message: 'Validation error',
    } as unknown as Error;

    const response = handleApiError(error, 'POST /api/test');

    expect(response.status).toBe(400);
  });

  it('should send error to Sentry when configured for Error objects', () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'test-dsn';
    const { captureException } = require('@sentry/nextjs');
    const error = new Error('Test error');

    handleApiError(error, 'GET /api/test');

    expect(captureException).toHaveBeenCalled();
  });

  it('should not send ZodError to Sentry', () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'test-dsn';
    const { captureException } = require('@sentry/nextjs');
    const zodError = new ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'number',
        path: ['email'],
        message: 'Expected string, received number',
      },
    ]);

    handleApiError(zodError, 'POST /api/test');

    expect(captureException).not.toHaveBeenCalled();
  });

  it('should send unknown error to Sentry when configured', () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'test-dsn';
    const { captureException } = require('@sentry/nextjs');
    const unknownError = { someProperty: 'value' };

    handleApiError(unknownError, 'GET /api/test');

    expect(captureException).toHaveBeenCalled();
  });

  it('should send Prisma error to Sentry when configured', () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'test-dsn';
    const { captureException } = require('@sentry/nextjs');
    const prismaError = {
      code: 'P9999',
      meta: { some: 'data' },
      message: 'Unknown Prisma error',
    } as Prisma.PrismaClientKnownRequestError;

    handleApiError(prismaError, 'POST /api/test');

    expect(captureException).toHaveBeenCalled();
  });

  it('should handle error without context', () => {
    const error = new Error('Test error');
    const { logger } = require('@/lib/logger');

    handleApiError(error);

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error:'), error);
  });

  it('should include stack trace in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const error = new Error('Test error');
    error.stack = 'Error: Test error\n    at test.js:1:1';

    const response = handleApiError(error, 'GET /api/test');

    const data = response.json() as Promise<{ details?: { stack?: string } }>;
    return data.then((result) => {
      expect(result.details?.stack).toBeDefined();
      process.env.NODE_ENV = originalEnv;
    });
  });

  it('should not include stack trace in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const error = new Error('Test error');
    error.stack = 'Error: Test error\n    at test.js:1:1';

    const response = handleApiError(error, 'GET /api/test');

    const data = response.json() as Promise<{ details?: { stack?: string } }>;
    return data.then((result) => {
      expect(result.details?.stack).toBeUndefined();
      process.env.NODE_ENV = originalEnv;
    });
  });

  it('should handle Prisma P2002 with multiple fields', () => {
    const prismaError = {
      code: 'P2002',
      meta: { target: ['email', 'username'] },
      message: 'Unique constraint failed',
    } as Prisma.PrismaClientKnownRequestError;

    const response = handleApiError(prismaError, 'POST /api/test');

    expect(response.status).toBe(409);
    const data = response.json() as Promise<{ error: string }>;
    return data.then((result) => {
      expect(result.error).toContain('email, username');
    });
  });

  it('should handle Prisma P2002 with no target fields', () => {
    const prismaError = {
      code: 'P2002',
      meta: {},
      message: 'Unique constraint failed',
    } as Prisma.PrismaClientKnownRequestError;

    const response = handleApiError(prismaError, 'POST /api/test');

    expect(response.status).toBe(409);
    const data = response.json() as Promise<{ error: string }>;
    return data.then((result) => {
      expect(result.error).toContain('unknown field');
    });
  });

  it('should handle Prisma P2014 with no field_name', () => {
    const prismaError = {
      code: 'P2014',
      meta: {},
      message: 'Required relation violation',
    } as Prisma.PrismaClientKnownRequestError;

    const response = handleApiError(prismaError, 'POST /api/test');

    expect(response.status).toBe(400);
    const data = response.json() as Promise<{ error: string }>;
    return data.then((result) => {
      expect(result.error).toContain('unknown field');
    });
  });

  it('should handle Prisma error detected by constructor name', () => {
    const prismaError = {
      constructor: { name: 'PrismaClientKnownRequestError' },
      code: 'P2002',
      meta: { target: ['email'] },
      message: 'Unique constraint failed',
    } as unknown as Prisma.PrismaClientKnownRequestError;

    const response = handleApiError(prismaError, 'POST /api/test');

    expect(response.status).toBe(409);
  });

  it('should handle Prisma error detected by code property without constructor name', () => {
    const prismaError = {
      code: 'P2002',
      meta: { target: ['email'] },
      message: 'Unique constraint failed',
    } as unknown as Prisma.PrismaClientKnownRequestError;

    const response = handleApiError(prismaError, 'POST /api/test');

    expect(response.status).toBe(409);
  });

  it('should handle error without context parameter', () => {
    const error = new Error('Test error');
    const { logger } = require('@/lib/logger');

    handleApiError(error);

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error:'), error);
  });

  it('should handle Prisma P2003 with no meta field_name', () => {
    const prismaError = {
      code: 'P2003',
      meta: {},
      message: 'Foreign key constraint failed',
    } as Prisma.PrismaClientKnownRequestError;

    const response = handleApiError(prismaError, 'POST /api/test');

    expect(response.status).toBe(400);
    const data = response.json() as Promise<{ error: string }>;
    return data.then((result) => {
      expect(result.error).toContain('unknown relation');
    });
  });

  it('should handle Prisma P2003 with meta but no field_name', () => {
    const prismaError = {
      code: 'P2003',
      meta: { other: 'data' },
      message: 'Foreign key constraint failed',
    } as Prisma.PrismaClientKnownRequestError;

    const response = handleApiError(prismaError, 'POST /api/test');

    expect(response.status).toBe(400);
    const data = response.json() as Promise<{ error: string }>;
    return data.then((result) => {
      expect(result.error).toContain('unknown relation');
    });
  });

  it('should not send error to Sentry when DSN is not configured', () => {
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    const { captureException } = require('@sentry/nextjs');
    const error = new Error('Test error');

    handleApiError(error, 'GET /api/test');

    expect(captureException).not.toHaveBeenCalled();
  });

  it('should handle unknown error type without Sentry', () => {
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    const unknownError = { someProperty: 'value' };

    const response = handleApiError(unknownError, 'GET /api/test');

    expect(response.status).toBe(500);
  });

  it('should handle Prisma error with unknown code without Sentry', () => {
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    const prismaError = {
      code: 'P9999',
      meta: { some: 'data' },
      message: 'Unknown Prisma error',
    } as Prisma.PrismaClientKnownRequestError;

    const response = handleApiError(prismaError, 'POST /api/test');

    expect(response.status).toBe(500);
    const data = response.json() as Promise<{ error: string; details?: { code?: string } }>;
    return data.then((result) => {
      expect(result.error).toBe('Database operation failed');
      expect(result.details?.code).toBe('P9999');
    });
  });

  it('should handle Prisma error with unknown code with Sentry', () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'test-dsn';
    const { captureException } = require('@sentry/nextjs');
    const prismaError = {
      code: 'P8888',
      meta: { some: 'data' },
      message: 'Unknown Prisma error',
    } as Prisma.PrismaClientKnownRequestError;

    const response = handleApiError(prismaError, 'POST /api/test');

    expect(response.status).toBe(500);
    expect(captureException).toHaveBeenCalled();
  });

  it('should handle error with null constructor', () => {
    const error = {
      constructor: null,
      message: 'Test error',
    } as unknown as Error;

    const response = handleApiError(error, 'GET /api/test');

    expect(response.status).toBe(500);
  });

  it('should handle error with undefined constructor name', () => {
    const error = {
      constructor: { name: undefined },
      message: 'Test error',
    } as unknown as Error;

    const response = handleApiError(error, 'GET /api/test');

    expect(response.status).toBe(500);
  });

  it('should handle error object without constructor', () => {
    const error = {
      message: 'Test error',
    } as unknown as Error;

    const response = handleApiError(error, 'GET /api/test');

    expect(response.status).toBe(500);
  });

  it('should handle Prisma error with code but no constructor name', () => {
    const prismaError = {
      code: 'P2002',
      meta: { target: ['email'] },
      message: 'Unique constraint failed',
    } as unknown as Prisma.PrismaClientKnownRequestError;

    const response = handleApiError(prismaError, 'POST /api/test');

    expect(response.status).toBe(409);
  });

  it('should handle error with empty string constructor name', () => {
    const error = {
      constructor: { name: '' },
      message: 'Test error',
    } as unknown as Error;

    const response = handleApiError(error, 'GET /api/test');

    expect(response.status).toBe(500);
  });

  it('should handle PrismaClientUnknownRequestError with message', () => {
    const error = {
      constructor: { name: 'PrismaClientUnknownRequestError' },
      message: 'Unknown Prisma error',
    } as unknown as Error;

    const response = handleApiError(error, 'GET /api/test');

    expect(response.status).toBe(500);
    const data = response.json() as Promise<{ error: string }>;
    return data.then((result) => {
      expect(result.error).toBe('Database error occurred');
    });
  });

  it('should handle PrismaClientValidationError with message', () => {
    const error = {
      constructor: { name: 'PrismaClientValidationError' },
      message: 'Validation error',
    } as unknown as Error;

    const response = handleApiError(error, 'POST /api/test');

    expect(response.status).toBe(400);
    const data = response.json() as Promise<{ error: string }>;
    return data.then((result) => {
      expect(result.error).toBe('Invalid data provided');
    });
  });

  it('should not send Error to Sentry when DSN is not configured', () => {
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    const { captureException } = require('@sentry/nextjs');
    const error = new Error('Test error');

    handleApiError(error, 'GET /api/test');

    expect(captureException).not.toHaveBeenCalled();
  });

  it('should include stack in development mode for Error', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const error = new Error('Test error');
    error.stack = 'Error: Test error\n    at test.js:1:1';

    const response = handleApiError(error, 'GET /api/test');

    const data = response.json() as Promise<{ details?: { stack?: string } }>;
    return data.then((result) => {
      expect(result.details?.stack).toBeDefined();
      process.env.NODE_ENV = originalEnv;
    });
  });

  it('should not include stack in production mode for Error', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const error = new Error('Test error');
    error.stack = 'Error: Test error\n    at test.js:1:1';

    const response = handleApiError(error, 'GET /api/test');

    const data = response.json() as Promise<{ details?: { stack?: string } }>;
    return data.then((result) => {
      expect(result.details?.stack).toBeUndefined();
      process.env.NODE_ENV = originalEnv;
    });
  });

  it('should handle Error with name property', () => {
    const error = new Error('Test error');
    error.name = 'CustomError';

    const response = handleApiError(error, 'GET /api/test');

    const data = response.json() as Promise<{ details?: { name?: string } }>;
    return data.then((result) => {
      expect(result.details?.name).toBe('CustomError');
    });
  });

  it('should handle Error without stack property', () => {
    const error = new Error('Test error');
    delete (error as any).stack;

    const response = handleApiError(error, 'GET /api/test');

    expect(response.status).toBe(500);
  });

  it('should handle unknown error type with string value', () => {
    const unknownError = 'string error';

    const response = handleApiError(unknownError, 'GET /api/test');

    expect(response.status).toBe(500);
    const data = response.json() as Promise<{ details?: { type?: string } }>;
    return data.then((result) => {
      expect(result.details?.type).toBe('string');
    });
  });

  it('should handle unknown error type with number value', () => {
    const unknownError = 123;

    const response = handleApiError(unknownError, 'GET /api/test');

    expect(response.status).toBe(500);
    const data = response.json() as Promise<{ details?: { type?: string } }>;
    return data.then((result) => {
      expect(result.details?.type).toBe('number');
    });
  });

  it('should handle unknown error type with boolean value', () => {
    const unknownError = true;

    const response = handleApiError(unknownError, 'GET /api/test');

    expect(response.status).toBe(500);
    const data = response.json() as Promise<{ details?: { type?: string } }>;
    return data.then((result) => {
      expect(result.details?.type).toBe('boolean');
    });
  });
});
