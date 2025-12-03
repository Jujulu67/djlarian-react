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
});
